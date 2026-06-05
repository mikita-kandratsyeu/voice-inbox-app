import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import type { TranscriptSegment, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { getWhisperModelVariantId, useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { shouldApplyAutoAiAfterTranscription } from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import { ensureRecordingsDir, i18n, RECORDINGS_DIR, useNetworkStatus } from '@/shared/lib';
import { convertToWav } from '@/shared/lib/audio';
import { NitroFS } from '@/shared/lib/fs';

import { getWhisperContext, resetWhisperContext, scheduleIdleRelease } from '../lib/initWhisper';
import { resolveTranscriptionChunkProfile } from '../lib/resolveTranscriptionChunkProfile';
import { transcribeAudio } from '../lib/transcribeAudio';
import {
  getTranscriptionCheckpoint,
  removeTranscriptionCheckpoint,
  saveTranscriptionCheckpoint,
} from '../lib/transcriptionCheckpoint';
import {
  getTranscriptionErrorCode,
  isAbortTranscriptionError,
  shouldQueueWhisperResetForError,
} from '../lib/transcriptionErrors';
import {
  cancelTranscriptionPausedNotification,
  showTranscriptionPausedNotification,
} from '../lib/transcriptionPausedNotification';
import { validateTranscriptionStart } from '../lib/validateTranscriptionStart';
import { clearPendingBackgroundTranscriptionRecord } from './pendingBackgroundTranscriptionRecord';
import { isTranscriptionBlockedForRecord } from './transcriptionConcurrency';
import {
  beginTranscriptionJob,
  endTranscriptionJobIfCurrent,
  hasActiveTranscriptionJob,
  invalidateTranscriptionJob,
  isActiveTranscriptionJob,
} from './transcriptionJobRegistry';
import { requestTranscriptionResumePrompt } from './transcriptionResumePromptRequest';
import {
  beginTranscriptionSession,
  clearTranscriptionBackgroundCancelled,
  clearTranscriptionCheckpointSnapshot,
  endTranscriptionSession,
  getActiveTranscriptionRecordId,
  getTranscriptionCheckpointSnapshot,
  getTranscriptionRuntimeSnapshot,
  isNativeTranscriptionRunning,
  isTranscriptionBackgroundCancelled,
  persistTranscriptionCheckpointForBackground,
  registerActiveTranscription,
  rememberTranscriptionCheckpointSnapshot,
  rememberWhisperResetResult,
  resetTranscriptionRuntimeForRestart,
  setTranscriptionRuntimeState,
  unregisterActiveTranscription,
} from './transcriptionRuntimeRegistry';

const PROGRESS_THROTTLE_MS = 500;
const CHECKPOINT_MIN_INTERVAL_MS = 4_000;
const DISCARD_RESET_UI_TIMEOUT_MS = 3_000;
const pendingWhisperResetRecordIds = new Set<string>();

const createThrottledProgress = (
  recordId: string,
  jobGen: number,
  updateAiStatus: (
    id: string,
    status: 'processing',
    progress?: number,
    label?: string,
    segments?: { current: number; total: number } | null,
  ) => void,
) => {
  let lastCall = 0;

  return (current: number, total: number) => {
    if (!isActiveTranscriptionJob(recordId, jobGen)) {
      return;
    }

    const now = Date.now();
    const isComplete = current >= total;

    if (isComplete || now - lastCall >= PROGRESS_THROTTLE_MS) {
      lastCall = now;
      const percent = Math.round((current / total) * 100);
      const label = i18n.t('transcription.progress', { current, total });
      updateAiStatus(recordId, 'processing', percent, label, { current, total });
    }
  };
};

const isFileNotFoundError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('enoent') ||
    msg.includes('no such file') ||
    msg.includes('file not found') ||
    msg.includes('not found')
  );
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const shouldFullyResetWhisperBeforeStart = (record: VoiceRecord): boolean => {
  const runtime = getTranscriptionRuntimeSnapshot();
  return (
    pendingWhisperResetRecordIds.has(record.id) ||
    record.aiStatus === 'error' ||
    runtime.consecutiveResetFailures > 0 ||
    runtime.nativeBusyTimeouts > 0 ||
    (runtime.recordId === record.id &&
      (runtime.state === 'stopping' || runtime.state === 'resetting'))
  );
};

export const useTranscription = () => {
  const updateAiStatus = useRecordStore((s) => s.updateAiStatus);
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const clearAudioPath = useRecordStore((s) => s.clearAudioPath);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const selectedWhisperModelFormat = useSettingsStore((s) => s.selectedWhisperModelFormat);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const setWhisperModelStatus = useSettingsStore((s) => s.setWhisperModelStatus);
  const transcriptionLanguage = useSettingsStore((s) => s.transcriptionLanguage);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();
  const { processRecord } = useAiProcessing();

  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const currentRecordIdRef = useRef<string | null>(null);

  const startTranscription = useCallback(
    async (record: VoiceRecord, languageOverride?: string): Promise<void> => {
      void cancelTranscriptionPausedNotification(record.id).catch(() => {});
      const shouldResetBeforeStart =
        pendingWhisperResetRecordIds.has(record.id) ||
        record.aiStatus === 'paused' ||
        record.aiStatus === 'resumable' ||
        record.aiStatus === 'error' ||
        currentRecordIdRef.current === record.id ||
        getActiveTranscriptionRecordId() === record.id ||
        hasActiveTranscriptionJob(record.id) ||
        ((record.transcriptProgress ?? 0) > 0 && !record.transcript.trim());

      if (currentRecordIdRef.current === record.id && stopRef.current) {
        const prevStop = stopRef.current;
        stopRef.current = null;
        await prevStop().catch(() => {});
      }

      if (shouldResetBeforeStart) {
        try {
          const needsFullReset = shouldFullyResetWhisperBeforeStart(record);
          await resetTranscriptionRuntimeForRestart(record.id);
          if (needsFullReset) {
            const reset = await resetWhisperContext();
            rememberWhisperResetResult(reset);
            if (!reset) {
              pendingWhisperResetRecordIds.add(record.id);
              const canResume =
                record.aiStatus === 'paused' ||
                record.aiStatus === 'resumable' ||
                (record.transcriptProgress ?? 0) > 0;
              updateAiStatus(
                record.id,
                canResume ? 'resumable' : 'idle',
                record.transcriptProgress ?? 0,
              );
              return;
            }
          }
          pendingWhisperResetRecordIds.delete(record.id);
        } catch (err) {
          if (__DEV__) console.warn('[transcription] restart reset failed', err);
          rememberWhisperResetResult(false);
          pendingWhisperResetRecordIds.add(record.id);
          updateAiStatus(record.id, 'idle', record.transcriptProgress ?? 0);
          return;
        }
      }

      const records = useRecordStore.getState().records;
      const otherRecordBusy = isTranscriptionBlockedForRecord(record.id, records);
      const nativeBusyForThisRecord =
        isNativeTranscriptionRunning() && getActiveTranscriptionRecordId() === record.id;
      const variantId = getWhisperModelVariantId(selectedWhisperModel, selectedWhisperModelFormat);
      const modelStatus = whisperModelStatuses[variantId] ?? 'not_downloaded';
      const preflight = await validateTranscriptionStart({
        record,
        modelId: selectedWhisperModel,
        modelFormat: selectedWhisperModelFormat,
        modelStatus,
        appIsActive: AppState.currentState === 'active',
        transcriptionBusy:
          otherRecordBusy || (isNativeTranscriptionRunning() && !nativeBusyForThisRecord),
      });

      if (!preflight.ok) {
        if (preflight.reason === 'model_file_missing') {
          setWhisperModelStatus(selectedWhisperModel, selectedWhisperModelFormat, 'not_downloaded');
        }
        if (preflight.reason === 'audio_file_missing') {
          await clearAudioPath(record.id).catch(() => {});
        }

        updateAiStatus(record.id, 'error');
        return;
      }

      const normalizedAudioPath = preflight.normalizedAudioPath;
      const audioPath = record.audioPath ?? normalizedAudioPath;

      clearTranscriptionBackgroundCancelled(record.id);

      const jobGen = beginTranscriptionJob(record.id);
      beginTranscriptionSession(record.id);
      registerActiveTranscription(record.id, async () => {
        if (stopRef.current) {
          await stopRef.current();
        }
      });

      updateAiStatus(record.id, 'loading_model', 0, i18n.t('transcription.loadingModel'), null);
      currentRecordIdRef.current = record.id;

      const language = languageOverride ?? transcriptionLanguage;
      let usedContext = false;
      let transcodeWavPath: string | null = null;
      let keepCheckpointSnapshot = false;
      let completedSuccessfully = false;

      try {
        const context = await getWhisperContext(selectedWhisperModel, selectedWhisperModelFormat);
        usedContext = true;

        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          updateAiStatus(record.id, 'idle');
          return;
        }

        if (isTranscriptionBackgroundCancelled(record.id)) {
          keepCheckpointSnapshot = true;
          updateAiStatus(record.id, 'paused');
          return;
        }

        updateAiStatus(record.id, 'processing', 0, undefined, null);
        setTranscriptionRuntimeState('transcribing', record.id);

        const throttledProgress = createThrottledProgress(record.id, jobGen, updateAiStatus);
        const chunkProfile = resolveTranscriptionChunkProfile();
        let lastCheckpointPersistAt = 0;
        let transcribeInputPath = audioPath;
        if (!normalizedAudioPath.toLowerCase().endsWith('.wav')) {
          await ensureRecordingsDir();
          const wavOut = `${RECORDINGS_DIR}/${record.id}.transcode.wav`;

          const converted = await convertToWav(normalizedAudioPath, wavOut);
          if (!converted) {
            if (__DEV__) console.warn('[transcription] convert to wav failed', record.id);
            currentRecordIdRef.current = null;
            updateAiStatus(record.id, 'error');
            return;
          }
          transcodeWavPath = converted.startsWith('file://') ? converted.slice(7) : converted;
          transcribeInputPath = transcodeWavPath;
        }

        if (
          !isActiveTranscriptionJob(record.id, jobGen) ||
          isTranscriptionBackgroundCancelled(record.id)
        ) {
          if (isTranscriptionBackgroundCancelled(record.id)) {
            keepCheckpointSnapshot = true;
            updateAiStatus(record.id, 'paused');
          }
          return;
        }

        const checkpoint =
          (await getTranscriptionCheckpoint(record.id)) ??
          getTranscriptionCheckpointSnapshot(record.id);
        const canResumeFromCheckpoint =
          checkpoint &&
          checkpoint.audioPath === normalizedAudioPath &&
          checkpoint.modelId === selectedWhisperModel &&
          checkpoint.language === language;
        const resume =
          canResumeFromCheckpoint && checkpoint
            ? {
                startChunkIndex: checkpoint.lastCompletedChunkIndex + 1,
                fullText: checkpoint.fullText,
                segments: checkpoint.segments,
              }
            : undefined;

        const runTranscription = async (resumePayload?: {
          startChunkIndex: number;
          fullText: string;
          segments: TranscriptSegment[];
        }) => {
          const transcribeHandle = transcribeAudio({
            context,
            audioPath: transcribeInputPath,
            durationMs: record.durationMs ?? 0,
            language,
            chunkProfile,
            onProgress: throttledProgress,
            resume: resumePayload,
            onChunkCompleted: ({ chunkIndex, totalChunks, fullText, segments }) => {
              if (!isActiveTranscriptionJob(record.id, jobGen)) {
                return;
              }

              const snapshot = {
                recordId: record.id,
                audioPath: normalizedAudioPath,
                modelId: selectedWhisperModel,
                language,
                totalChunks,
                lastCompletedChunkIndex: chunkIndex,
                fullText,
                segments,
              };
              rememberTranscriptionCheckpointSnapshot(snapshot);

              const now = Date.now();
              const shouldPersist =
                now - lastCheckpointPersistAt >= CHECKPOINT_MIN_INTERVAL_MS ||
                chunkIndex + 1 >= totalChunks;
              if (!shouldPersist) {
                return;
              }

              lastCheckpointPersistAt = now;
              saveTranscriptionCheckpoint(snapshot).catch((err) => {
                if (__DEV__) console.warn('[transcription] checkpoint save failed', err);
              });
            },
          });

          const { stop, promise } = transcribeHandle;
          stopRef.current = stop;
          registerActiveTranscription(record.id, stop);
          return promise;
        };

        let transcriptionResult: Awaited<ReturnType<typeof runTranscription>>;
        try {
          transcriptionResult = await runTranscription(resume);
        } catch (resumeErr) {
          if (resume) {
            await removeTranscriptionCheckpoint(record.id).catch(() => {});
            transcriptionResult = await runTranscription(undefined);
          } else {
            throw resumeErr;
          }
        }

        const { segments, fullText, skipped } = transcriptionResult;

        if (isActiveTranscriptionJob(record.id, jobGen)) {
          stopRef.current = null;
          currentRecordIdRef.current = null;
          unregisterActiveTranscription(record.id);
        }

        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          return;
        }

        if (skipped) {
          await removeTranscriptionCheckpoint(record.id).catch(() => {});
          updateAiStatus(record.id, 'idle');
          return;
        }

        await updateTranscript(record.id, fullText, segments);
        await removeTranscriptionCheckpoint(record.id).catch(() => {});
        await cancelTranscriptionPausedNotification(record.id).catch(() => {});
        clearTranscriptionCheckpointSnapshot(record.id);
        const recordWithTranscript = {
          ...record,
          transcript: fullText,
          transcriptSegments: segments,
        };
        generateAndSaveEmbeddingForRecord(recordWithTranscript).catch(() => {});

        if (
          shouldApplyAutoAiAfterTranscription(autoAiAfterTranscription, isProActive) &&
          isConnected
        ) {
          processRecord({
            ...record,
            transcript: fullText,
            transcriptSegments: segments,
          }).catch(() => {});
        }

        completedSuccessfully = true;
      } catch (err) {
        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          if (isTranscriptionBackgroundCancelled(record.id)) {
            keepCheckpointSnapshot = true;
            updateAiStatus(record.id, 'paused');
          }
          unregisterActiveTranscription(record.id);
          return;
        }

        stopRef.current = null;
        currentRecordIdRef.current = null;
        unregisterActiveTranscription(record.id);

        const pausedForBackground = isTranscriptionBackgroundCancelled(record.id);
        const errorCode = getTranscriptionErrorCode(err);
        const isCancelled = isAbortTranscriptionError(err);
        keepCheckpointSnapshot = pausedForBackground;

        if (isCancelled || pausedForBackground) {
          if (shouldQueueWhisperResetForError(err)) {
            pendingWhisperResetRecordIds.add(record.id);
          }
          if (!pausedForBackground) {
            await removeTranscriptionCheckpoint(record.id).catch(() => {});
          } else {
            clearTranscriptionBackgroundCancelled(record.id);
          }
          updateAiStatus(record.id, pausedForBackground ? 'paused' : 'idle');
        } else {
          await removeTranscriptionCheckpoint(record.id).catch(() => {});
          if (errorCode === 'model_load_failed' || errorCode === 'model_missing') {
            setWhisperModelStatus(
              selectedWhisperModel,
              selectedWhisperModelFormat,
              'not_downloaded',
            );
          }
          if (errorCode === 'audio_missing' || isFileNotFoundError(err)) {
            await clearAudioPath(record.id).catch(() => {});
          }
          if (shouldQueueWhisperResetForError(err)) {
            pendingWhisperResetRecordIds.add(record.id);
          }
          if (__DEV__) console.warn('[transcription] Failed:', err);
          updateAiStatus(record.id, 'error');
        }
      } finally {
        const transcodePathNorm = transcodeWavPath?.startsWith('file://')
          ? transcodeWavPath.slice(7)
          : transcodeWavPath;
        if (transcodeWavPath && transcodePathNorm && transcodePathNorm !== normalizedAudioPath) {
          void NitroFS.unlink(transcodeWavPath).catch(() => {});
        }
        if (keepCheckpointSnapshot) {
          const saved = await persistTranscriptionCheckpointForBackground(record.id);
          if (saved) {
            updateAiStatus(record.id, 'resumable');
            void showTranscriptionPausedNotification({
              recordId: record.id,
              recordTitle: record.title,
              checkpointVerified: true,
            }).catch(() => {});
            requestTranscriptionResumePrompt(record.id);
          } else {
            updateAiStatus(record.id, 'idle');
          }
        } else {
          clearTranscriptionCheckpointSnapshot(record.id);
        }
        endTranscriptionJobIfCurrent(record.id, jobGen);
        endTranscriptionSession(record.id);
        unregisterActiveTranscription(record.id);
        if (usedContext) {
          scheduleIdleRelease({ reason: completedSuccessfully ? 'completed' : 'default' });
        }
      }
    },
    [
      selectedWhisperModel,
      selectedWhisperModelFormat,
      whisperModelStatuses,
      transcriptionLanguage,
      autoAiAfterTranscription,
      isProActive,
      isConnected,
      processRecord,
      updateAiStatus,
      updateTranscript,
      clearAudioPath,
      setWhisperModelStatus,
    ],
  );

  const cancelTranscription = useCallback(
    (recordId: string): void => {
      invalidateTranscriptionJob(recordId);
      currentRecordIdRef.current = null;
      const existing = useRecordStore.getState().records.find((r) => r.id === recordId);
      const hasTranscript = Boolean(existing?.transcript?.trim());
      const nextStatus = hasTranscript ? 'done' : 'idle';
      if (stopRef.current) {
        const stop = stopRef.current;
        stopRef.current = null;
        updateAiStatus(recordId, 'cancelling', existing?.transcriptProgress ?? 0);
        setTranscriptionRuntimeState('stopping', recordId);
        const stopTask = stop();
        void (async () => {
          try {
            const finished = await Promise.race([
              stopTask.then(() => true),
              wait(DISCARD_RESET_UI_TIMEOUT_MS).then(() => false),
            ]);
            if (!finished) {
              pendingWhisperResetRecordIds.add(recordId);
              void stopTask.catch(() => {});
            }
          } catch {
            pendingWhisperResetRecordIds.add(recordId);
          } finally {
            updateAiStatus(recordId, nextStatus, hasTranscript ? 100 : 0);
          }
        })();
      } else {
        updateAiStatus(recordId, nextStatus, hasTranscript ? 100 : 0);
      }
      unregisterActiveTranscription(recordId);
      endTranscriptionSession(recordId);
      clearTranscriptionBackgroundCancelled(recordId);
      clearTranscriptionCheckpointSnapshot(recordId);
      removeTranscriptionCheckpoint(recordId).catch(() => {});
      cancelTranscriptionPausedNotification(recordId).catch(() => {});
      clearPendingBackgroundTranscriptionRecord();
    },
    [updateAiStatus],
  );

  const discardPausedTranscription = useCallback(
    async (recordId: string): Promise<void> => {
      const existing = useRecordStore.getState().records.find((r) => r.id === recordId);
      updateAiStatus(recordId, 'cancelling', existing?.transcriptProgress ?? 0);
      invalidateTranscriptionJob(recordId);
      currentRecordIdRef.current = null;
      clearTranscriptionBackgroundCancelled(recordId);
      clearTranscriptionCheckpointSnapshot(recordId);
      clearPendingBackgroundTranscriptionRecord();

      const resetTask = (async () => {
        await resetTranscriptionRuntimeForRestart(recordId);
        const reset = await resetWhisperContext();
        rememberWhisperResetResult(reset);
        if (reset) {
          pendingWhisperResetRecordIds.delete(recordId);
        } else {
          pendingWhisperResetRecordIds.add(recordId);
        }
      })();

      try {
        const finished = await Promise.race([
          resetTask.then(() => true),
          wait(DISCARD_RESET_UI_TIMEOUT_MS).then(() => false),
        ]);
        if (!finished) {
          pendingWhisperResetRecordIds.add(recordId);
          void resetTask.catch((err) => {
            if (__DEV__) console.warn('[transcription] discard reset failed', err);
          });
        }
      } catch (err) {
        if (__DEV__) console.warn('[transcription] discard reset failed', err);
        rememberWhisperResetResult(false);
        pendingWhisperResetRecordIds.add(recordId);
      } finally {
        unregisterActiveTranscription(recordId);
        endTranscriptionSession(recordId);
        clearTranscriptionBackgroundCancelled(recordId);
        clearTranscriptionCheckpointSnapshot(recordId);
        updateAiStatus(recordId, 'idle', 0);
        void removeTranscriptionCheckpoint(recordId).catch(() => {});
        void cancelTranscriptionPausedNotification(recordId).catch(() => {});
      }
    },
    [updateAiStatus],
  );

  return { startTranscription, cancelTranscription, discardPausedTranscription };
};
