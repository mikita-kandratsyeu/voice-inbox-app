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
import { transcribeAudio } from '../lib/transcribeAudio';
import {
  getTranscriptionCheckpoint,
  removeTranscriptionCheckpoint,
  saveTranscriptionCheckpoint,
} from '../lib/transcriptionCheckpoint';
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
  isNativeTranscriptionRunning,
  isTranscriptionBackgroundCancelled,
  persistTranscriptionCheckpointForBackground,
  registerActiveTranscription,
  rememberTranscriptionCheckpointSnapshot,
  resetTranscriptionRuntimeForRestart,
  unregisterActiveTranscription,
} from './transcriptionRuntimeRegistry';

const PROGRESS_THROTTLE_MS = 500;
const CHECKPOINT_EVERY_N_CHUNKS = 2;

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
        record.aiStatus === 'paused' ||
        record.aiStatus === 'resumable' ||
        record.aiStatus === 'error' ||
        currentRecordIdRef.current === record.id ||
        getActiveTranscriptionRecordId() === record.id ||
        hasActiveTranscriptionJob(record.id);

      if (currentRecordIdRef.current === record.id && stopRef.current) {
        const prevStop = stopRef.current;
        stopRef.current = null;
        await prevStop().catch(() => {});
      }

      if (shouldResetBeforeStart) {
        try {
          await resetTranscriptionRuntimeForRestart(record.id);
          await resetWhisperContext();
        } catch (err) {
          if (__DEV__) console.warn('[transcription] restart reset failed', err);
          updateAiStatus(record.id, 'error');
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

        const throttledProgress = createThrottledProgress(record.id, jobGen, updateAiStatus);
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

              const shouldPersist =
                (chunkIndex + 1) % CHECKPOINT_EVERY_N_CHUNKS === 0 || chunkIndex + 1 >= totalChunks;
              if (!shouldPersist) {
                return;
              }

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
            if (__DEV__) {
              console.warn('[transcription] resume failed, retrying from start', {
                recordId: record.id,
                err: resumeErr instanceof Error ? resumeErr.message : String(resumeErr),
              });
            }
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

        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        const isCancelled = msg.includes('abort') || msg.includes('cancel') || msg.includes('stop');

        const pausedForBackground = isTranscriptionBackgroundCancelled(record.id);
        keepCheckpointSnapshot = pausedForBackground;

        if (isCancelled || pausedForBackground) {
          if (!pausedForBackground) {
            await removeTranscriptionCheckpoint(record.id).catch(() => {});
          } else {
            clearTranscriptionBackgroundCancelled(record.id);
          }
          updateAiStatus(record.id, pausedForBackground ? 'paused' : 'idle');
        } else {
          await removeTranscriptionCheckpoint(record.id).catch(() => {});
          const msg = err instanceof Error ? err.message.toLowerCase() : '';
          const isModelLoadFailure = msg.includes('failed to load the model');
          if (isModelLoadFailure) {
            setWhisperModelStatus(
              selectedWhisperModel,
              selectedWhisperModelFormat,
              'not_downloaded',
            );
          }
          if (isFileNotFoundError(err)) {
            await clearAudioPath(record.id).catch(() => {});
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
        stop()
          .catch(() => {})
          .finally(() => {
            updateAiStatus(recordId, nextStatus, hasTranscript ? 100 : 0);
          });
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
    (recordId: string): void => {
      invalidateTranscriptionJob(recordId);
      currentRecordIdRef.current = null;
      unregisterActiveTranscription(recordId);
      endTranscriptionSession(recordId);
      clearTranscriptionBackgroundCancelled(recordId);
      clearTranscriptionCheckpointSnapshot(recordId);
      removeTranscriptionCheckpoint(recordId).catch(() => {});
      cancelTranscriptionPausedNotification(recordId).catch(() => {});
      clearPendingBackgroundTranscriptionRecord();
      updateAiStatus(recordId, 'idle', 0);
    },
    [updateAiStatus],
  );

  return { startTranscription, cancelTranscription, discardPausedTranscription };
};
