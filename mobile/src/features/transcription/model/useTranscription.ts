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
          language: 'auto',
          onProgress: (progress) => {
            updateAiStatus(record.id, 'processing', progress);
          },
        });

        stopRef.current = stop;

        const { segments, fullText } = await promise;
        stopRef.current = null;

        await updateTranscript(record.id, fullText, segments);
      } catch (err) {
        stopRef.current = null;

        const isCancelled =
          err instanceof Error && (err.message.includes('abort') || err.message.includes('cancel'));

        if (!isCancelled) {
          console.warn('[transcription] Failed:', err);
          updateAiStatus(record.id, 'error');
        } else {
          updateAiStatus(record.id, 'idle');
        }
      }
    },
    [selectedWhisperModel, whisperModelStatuses, updateAiStatus, updateTranscript],
  );

  const cancelTranscription = useCallback(
    async (recordId: string): Promise<void> => {
      if (stopRef.current) {
        await stopRef.current();
        stopRef.current = null;
      }
      updateAiStatus(recordId, 'idle');
    },
    [updateAiStatus],
  );

  return { startTranscription, cancelTranscription };
};
