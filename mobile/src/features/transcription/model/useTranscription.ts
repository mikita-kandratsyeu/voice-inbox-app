import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { i18n, useNetworkStatus } from '@/shared/lib';

import { getWhisperContext, scheduleIdleRelease } from '../lib/initWhisper';
import { transcribeAudio } from '../lib/transcribeAudio';

const PROGRESS_THROTTLE_MS = 500;

const createThrottledProgress = (
  recordId: string,
  updateAiStatus: (id: string, status: 'processing', progress?: number, label?: string) => void,
) => {
  let lastCall = 0;

  return (current: number, total: number) => {
    const now = Date.now();
    const isComplete = current >= total;

    if (isComplete || now - lastCall >= PROGRESS_THROTTLE_MS) {
      lastCall = now;
      const percent = Math.round((current / total) * 100);
      const label = i18n.t('transcription.progress', { current, total });
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
        if (__DEV__) console.warn('[transcription] No audio path for record', record.id);
        return;
      }

      const modelStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';
      if (modelStatus !== 'downloaded') {
        if (__DEV__)
          console.warn('[transcription] Selected model not downloaded:', selectedWhisperModel);
        updateAiStatus(record.id, 'error');
        return;
      }

      updateAiStatus(record.id, 'loading_model', 0, i18n.t('transcription.loadingModel'));
      currentRecordIdRef.current = record.id;

      const language = languageOverride ?? transcriptionLanguage;
      let usedContext = false;

      try {
        const context = await getWhisperContext(selectedWhisperModel);
        usedContext = true;

        updateAiStatus(record.id, 'processing', 0);

        const throttledProgress = createThrottledProgress(record.id, updateAiStatus);

        const { stop, promise } = transcribeAudio({
          context,
          audioPath: record.audioPath,
          durationMs: record.durationMs ?? 0,
          language,
          onProgress: throttledProgress,
        });

        stopRef.current = stop;

        const { segments, fullText, skipped } = await promise;
        stopRef.current = null;
        currentRecordIdRef.current = null;

        if (skipped) {
          updateAiStatus(record.id, 'idle');
          return;
        }

        if (__DEV__) {
          console.warn(
            `[whisper] recordId=${record.id} | model=${selectedWhisperModel} | lang=${language} | segments=${segments.length}\n${fullText}`,
          );
        }

        await updateTranscript(record.id, fullText, segments);

        const recordWithTranscript = {
          ...record,
          transcript: fullText,
          transcriptSegments: segments,
        };
        generateAndSaveEmbeddingForRecord(recordWithTranscript).catch(() => {});

        if (autoAiAfterTranscription && isConnected) {
          processRecord({
            ...record,
            transcript: fullText,
            transcriptSegments: segments,
          }).catch(() => {});
        }
      } catch (err) {
        stopRef.current = null;
        currentRecordIdRef.current = null;

        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        const isCancelled = msg.includes('abort') || msg.includes('cancel') || msg.includes('stop');
        const wasCancelled = isCancelled || stopRef.current === null;

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
        currentRecordIdRef.current = null;
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
      isConnected,
      processRecord,
      updateAiStatus,
      updateTranscript,
      clearAudioPath,
    ],
  );

  const cancelTranscription = useCallback(
    (recordId: string): void => {
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
