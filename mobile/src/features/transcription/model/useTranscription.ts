import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import type { TranscriptSegment, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { getWhisperModelVariantId, useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { shouldApplyAutoAiAfterTranscription } from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import { agentDebugLog } from '@/shared/lib/agentDebugLog';
import { ensureRecordingsDir, i18n, RECORDINGS_DIR, useNetworkStatus } from '@/shared/lib';
import { convertToWav } from '@/shared/lib/audio';
import { NitroFS } from '@/shared/lib/fs';
import { getWhisperModelPath } from '@/shared/lib/whisper';

import { getWhisperContext, scheduleIdleRelease } from '../lib/initWhisper';
import { transcribeAudio } from '../lib/transcribeAudio';
import {
  getTranscriptionCheckpoint,
  removeTranscriptionCheckpoint,
  saveTranscriptionCheckpoint,
} from '../lib/transcriptionCheckpoint';
import { clearPendingBackgroundTranscriptionRecord } from './pendingBackgroundTranscriptionRecord';
import {
  beginTranscriptionJob,
  endTranscriptionJobIfCurrent,
  invalidateTranscriptionJob,
  isActiveTranscriptionJob,
} from './transcriptionJobRegistry';
import { isTranscriptionBlockedForRecord } from './transcriptionConcurrency';
import {
  beginTranscriptionSession,
  clearTranscriptionBackgroundCancelled,
  clearTranscriptionCheckpointSnapshot,
  endTranscriptionSession,
  isTranscriptionBackgroundCancelled,
  registerActiveTranscription,
  rememberTranscriptionCheckpointSnapshot,
  unregisterActiveTranscription,
} from './transcriptionRuntimeRegistry';

const PROGRESS_THROTTLE_MS = 500;
const CHECKPOINT_EVERY_N_CHUNKS = 2;

const devLog = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) console.warn(`[transcription] ${event}`, payload ?? '');
};

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
      devLog('progress ignored (stale job)', { recordId, jobGen, current, total });
      return;
    }

    const now = Date.now();
    const isComplete = current >= total;

    if (isComplete || now - lastCall >= PROGRESS_THROTTLE_MS) {
      lastCall = now;
      const percent = Math.round((current / total) * 100);
      const label = i18n.t('transcription.progress', { current, total });
      devLog('progress', { recordId, jobGen, current, total, percent });
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
      if (AppState.currentState !== 'active') {
        return;
      }
      if (!record.audioPath) {
        devLog('aborted: no audio path', { recordId: record.id });
        return;
      }

      const records = useRecordStore.getState().records;
      if (isTranscriptionBlockedForRecord(record.id, records)) {
        devLog('blocked: another transcription active', { recordId: record.id });
        return;
      }

      const audioPath = record.audioPath;

      const variantId = getWhisperModelVariantId(selectedWhisperModel, selectedWhisperModelFormat);
      const modelStatus = whisperModelStatuses[variantId] ?? 'not_downloaded';
      if (modelStatus !== 'downloaded') {
        devLog('model not downloaded', { model: selectedWhisperModel });
        updateAiStatus(record.id, 'error');
        return;
      }

      const modelPath = getWhisperModelPath(selectedWhisperModel, selectedWhisperModelFormat);
      const hasModelFile = await NitroFS.exists(modelPath);
      if (!hasModelFile) {
        devLog('model file missing on disk', {
          model: selectedWhisperModel,
          format: selectedWhisperModelFormat,
          modelPath,
        });
        setWhisperModelStatus(selectedWhisperModel, selectedWhisperModelFormat, 'not_downloaded');
        updateAiStatus(record.id, 'error');
        return;
      }

      if (currentRecordIdRef.current === record.id && stopRef.current) {
        devLog('stopping previous run for same record', { recordId: record.id });
        const prevStop = stopRef.current;
        stopRef.current = null;
        await prevStop().catch(() => {});
      }

      clearTranscriptionBackgroundCancelled(record.id);

      const jobGen = beginTranscriptionJob(record.id);
      beginTranscriptionSession(record.id);
      // #region agent log
      agentDebugLog(
        'useTranscription.ts',
        'startTranscription',
        { recordId: record.id, jobGen, appState: AppState.currentState },
        'H7',
      );
      // #endregion
      devLog('job started', { recordId: record.id, jobGen });

      updateAiStatus(record.id, 'loading_model', 0, i18n.t('transcription.loadingModel'), null);
      currentRecordIdRef.current = record.id;

      const language = languageOverride ?? transcriptionLanguage;
      let usedContext = false;
      let transcodeWavPath: string | null = null;
      let keepCheckpointSnapshot = false;

      try {
        const context = await getWhisperContext(selectedWhisperModel, selectedWhisperModelFormat);
        usedContext = true;

        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          devLog('aborted after getWhisperContext (stale job)', { recordId: record.id, jobGen });
          updateAiStatus(record.id, 'idle');
          return;
        }

        if (isTranscriptionBackgroundCancelled(record.id)) {
          devLog('aborted after getWhisperContext (background flag)', {
            recordId: record.id,
            jobGen,
          });
          clearTranscriptionBackgroundCancelled(record.id);
          updateAiStatus(record.id, 'idle');
          return;
        }

        updateAiStatus(record.id, 'processing', 0, undefined, null);

        const throttledProgress = createThrottledProgress(record.id, jobGen, updateAiStatus);
        const normalizedAudioPath = audioPath.startsWith('file://')
          ? audioPath.slice(7)
          : audioPath;

        let transcribeInputPath = audioPath;
        if (!normalizedAudioPath.toLowerCase().endsWith('.wav')) {
          await ensureRecordingsDir();
          const wavOut = `${RECORDINGS_DIR}/${record.id}.wav`;
          const converted = await convertToWav(normalizedAudioPath, wavOut);
          if (!converted) {
            devLog('convert to wav failed (whisper input)', { recordId: record.id });
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
          devLog('aborted after wav prep (stale job)', { recordId: record.id, jobGen });
          return;
        }

        const checkpoint = await getTranscriptionCheckpoint(record.id);
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
              if (!shouldPersist) return;

              saveTranscriptionCheckpoint(snapshot).catch(() => {});
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
          devLog('completion ignored (stale job)', { recordId: record.id, jobGen });
          return;
        }

        if (skipped) {
          devLog('skipped (duration too short)', { recordId: record.id });
          await removeTranscriptionCheckpoint(record.id).catch(() => {});
          updateAiStatus(record.id, 'idle');
          return;
        }

        if (__DEV__) {
          console.warn(
            `[whisper] recordId=${record.id} | model=${selectedWhisperModel} | lang=${language} | segments=${segments.length}\n${fullText}`,
          );
        }

        devLog('saving transcript', { recordId: record.id, segments: segments.length });
        await updateTranscript(record.id, fullText, segments);
        await removeTranscriptionCheckpoint(record.id).catch(() => {});
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

        devLog('job completed', { recordId: record.id, jobGen });
      } catch (err) {
        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          devLog('catch ignored (stale job)', { recordId: record.id, jobGen, err });
          if (isTranscriptionBackgroundCancelled(record.id)) {
            clearTranscriptionBackgroundCancelled(record.id);
            updateAiStatus(record.id, 'idle');
          }
          unregisterActiveTranscription(record.id);
          return;
        }

        const hadStop = stopRef.current != null;
        stopRef.current = null;
        currentRecordIdRef.current = null;
        unregisterActiveTranscription(record.id);

        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        const isCancelled = msg.includes('abort') || msg.includes('cancel') || msg.includes('stop');

        const wasCancelled = isCancelled;

        devLog('job failed', {
          recordId: record.id,
          jobGen,
          wasCancelled,
          hadStop,
          err: err instanceof Error ? err.message : String(err),
        });

        const pausedForBackground = isTranscriptionBackgroundCancelled(record.id);
        keepCheckpointSnapshot = pausedForBackground;

        if (wasCancelled || pausedForBackground) {
          // #region agent log
          agentDebugLog(
            'useTranscription.ts',
            'cancel path',
            { recordId: record.id, wasCancelled, pausedForBackground },
            'H7',
          );
          // #endregion
          if (!pausedForBackground) {
            await removeTranscriptionCheckpoint(record.id).catch(() => {});
          } else {
            clearTranscriptionBackgroundCancelled(record.id);
          }
          updateAiStatus(record.id, 'idle');
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
        if (transcodeWavPath) {
          void NitroFS.unlink(transcodeWavPath).catch(() => {});
        }
        endTranscriptionJobIfCurrent(record.id, jobGen);
        endTranscriptionSession(record.id);
        if (!keepCheckpointSnapshot) {
          clearTranscriptionCheckpointSnapshot(record.id);
        }
        if (usedContext) {
          scheduleIdleRelease();
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
      devLog('cancel requested', { recordId });
      invalidateTranscriptionJob(recordId);
      currentRecordIdRef.current = null;
      const existing = useRecordStore.getState().records.find((r) => r.id === recordId);
      const hasTranscript = Boolean(existing?.transcript?.trim());
      if (hasTranscript) {
        updateAiStatus(recordId, 'done', 100);
      } else {
        updateAiStatus(recordId, 'idle');
      }
      if (stopRef.current) {
        const stop = stopRef.current;
        stopRef.current = null;
        stop().catch(() => {});
      }
      unregisterActiveTranscription(recordId);
      endTranscriptionSession(recordId);
      clearTranscriptionBackgroundCancelled(recordId);
      clearTranscriptionCheckpointSnapshot(recordId);
      removeTranscriptionCheckpoint(recordId).catch(() => {});
      clearPendingBackgroundTranscriptionRecord();
    },
    [updateAiStatus],
  );

  return { startTranscription, cancelTranscription };
};
