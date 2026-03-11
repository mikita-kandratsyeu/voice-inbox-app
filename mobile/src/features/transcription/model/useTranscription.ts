import { useCallback, useRef } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { i18n, useNetworkStatus } from '@/shared/lib';

import { getWhisperContext } from '../lib/initWhisper';
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

export const useTranscription = () => {
  const updateAiStatus = useRecordStore((s) => s.updateAiStatus);
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const transcriptionLanguage = useSettingsStore((s) => s.transcriptionLanguage);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const { isConnected } = useNetworkStatus();
  const { processRecord } = useAiProcessing();

  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const startTranscription = useCallback(
    async (record: VoiceRecord, languageOverride?: string): Promise<void> => {
      if (!record.audioPath) {
        console.warn('[transcription] No audio path for record', record.id);
        return;
      }

      const modelStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';
      if (modelStatus !== 'downloaded') {
        console.warn('[transcription] Selected model not downloaded:', selectedWhisperModel);
        updateAiStatus(record.id, 'error');
        return;
      }

      updateAiStatus(record.id, 'processing', 0);

      const language = languageOverride ?? transcriptionLanguage;

      try {
        const context = await getWhisperContext(selectedWhisperModel);

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

        if (autoAiAfterTranscription && isConnected) {
          processRecord({
            ...record,
            transcript: fullText,
            transcriptSegments: segments,
          }).catch(() => {});
        }
      } catch (err) {
        stopRef.current = null;

        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        const isCancelled = msg.includes('abort') || msg.includes('cancel') || msg.includes('stop');

        const wasCancelled = isCancelled || stopRef.current === null;

        if (wasCancelled) {
          updateAiStatus(record.id, 'idle');
        } else {
          console.warn('[transcription] Failed:', err);
          updateAiStatus(record.id, 'error');
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
    ],
  );

  const cancelTranscription = useCallback(
    (recordId: string): void => {
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
