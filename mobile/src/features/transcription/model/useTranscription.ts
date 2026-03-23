import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { shouldApplyAutoAiAfterTranscription } from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import { i18n, useNetworkStatus } from '@/shared/lib';

import { getWhisperContext, scheduleIdleRelease } from '../lib/initWhisper';
import { transcribeAudio } from '../lib/transcribeAudio';
import {
  beginTranscriptionJob,
  endTranscriptionJobIfCurrent,
  invalidateTranscriptionJob,
  isActiveTranscriptionJob,
} from './transcriptionJobRegistry';

const PROGRESS_THROTTLE_MS = 500;

const devLog = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) console.warn(`[transcription] ${event}`, payload ?? '');
};

const createThrottledProgress = (
  recordId: string,
  jobGen: number,
  updateAiStatus: (id: string, status: 'processing', progress?: number, label?: string) => void,
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
      updateAiStatus(recordId, 'processing', percent, label);
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
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
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

      const modelStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';
      if (modelStatus !== 'downloaded') {
        devLog('model not downloaded', { model: selectedWhisperModel });
        updateAiStatus(record.id, 'error');
        return;
      }

      if (currentRecordIdRef.current === record.id && stopRef.current) {
        devLog('stopping previous run for same record', { recordId: record.id });
        const prevStop = stopRef.current;
        stopRef.current = null;
        prevStop().catch(() => {});
      }

      const jobGen = beginTranscriptionJob(record.id);
      devLog('job started', { recordId: record.id, jobGen });

      updateAiStatus(record.id, 'loading_model', 0, i18n.t('transcription.loadingModel'));
      currentRecordIdRef.current = record.id;

      const language = languageOverride ?? transcriptionLanguage;
      let usedContext = false;

      try {
        const context = await getWhisperContext(selectedWhisperModel);
        usedContext = true;

        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          devLog('aborted after getWhisperContext (stale job)', { recordId: record.id, jobGen });
          return;
        }

        updateAiStatus(record.id, 'processing', 0);

        const throttledProgress = createThrottledProgress(record.id, jobGen, updateAiStatus);

        const { stop, promise } = transcribeAudio({
          context,
          audioPath: record.audioPath,
          durationMs: record.durationMs ?? 0,
          language,
          onProgress: throttledProgress,
        });

        stopRef.current = stop;

        const { segments, fullText, skipped } = await promise;

        if (isActiveTranscriptionJob(record.id, jobGen)) {
          stopRef.current = null;
          currentRecordIdRef.current = null;
        }

        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          devLog('completion ignored (stale job)', { recordId: record.id, jobGen });
          return;
        }

        if (skipped) {
          devLog('skipped (duration too short)', { recordId: record.id });
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
          return;
        }

        const hadStop = stopRef.current != null;
        stopRef.current = null;
        currentRecordIdRef.current = null;

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

        if (wasCancelled) {
          updateAiStatus(record.id, 'idle');
        } else {
          if (isFileNotFoundError(err)) {
            await clearAudioPath(record.id).catch(() => {});
          }
          if (__DEV__) console.warn('[transcription] Failed:', err);
          updateAiStatus(record.id, 'error');
        }
      } finally {
        endTranscriptionJobIfCurrent(record.id, jobGen);
        if (usedContext) {
          scheduleIdleRelease();
        }
      }
    },
    [
      selectedWhisperModel,
      whisperModelStatuses,
      transcriptionLanguage,
      autoAiAfterTranscription,
      isProActive,
      isConnected,
      processRecord,
      updateAiStatus,
      updateTranscript,
      clearAudioPath,
    ],
  );

  const cancelTranscription = useCallback(
    (recordId: string): void => {
      devLog('cancel requested', { recordId });
      invalidateTranscriptionJob(recordId);
      currentRecordIdRef.current = null;
      updateAiStatus(recordId, 'idle');
      if (stopRef.current) {
        const stop = stopRef.current;
        stopRef.current = null;
        stop().catch(() => {});
      }
    },
    [updateAiStatus],
  );

  return { startTranscription, cancelTranscription };
};
