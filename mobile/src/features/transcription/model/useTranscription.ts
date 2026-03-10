import { useCallback, useRef } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';

import { getWhisperContext } from '../lib/initWhisper';
import { transcribeAudio } from '../lib/transcribeAudio';

export const useTranscription = () => {
  const updateAiStatus = useRecordStore((s) => s.updateAiStatus);
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const transcriptionLanguage = useSettingsStore((s) => s.transcriptionLanguage);

  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const startTranscription = useCallback(
    async (record: VoiceRecord): Promise<void> => {
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

      try {
        const context = await getWhisperContext(selectedWhisperModel);

        const { stop, promise } = transcribeAudio({
          context,
          audioPath: record.audioPath,
          durationMs: record.durationMs ?? 0,
          language: transcriptionLanguage,
          onProgress: (current, total) => {
            const percent = Math.round((current / total) * 100);
            const label = `Обработано ${current} из ${total} фрагментов...`;
            updateAiStatus(record.id, 'processing', percent, label);
          },
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
            `[whisper] recordId=${record.id} | model=${selectedWhisperModel} | lang=${transcriptionLanguage} | segments=${segments.length}\n${fullText}`,
          );
        }

        await updateTranscript(record.id, fullText, segments);
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
