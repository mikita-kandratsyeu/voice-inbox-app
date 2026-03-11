import { useCallback, useRef } from 'react';

import type { TaskItem, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { AI_PROCESSING_SYSTEM_PROMPT, pollAiMessage, postAiMessage } from '@/shared/lib/ai-api';

type ProcessingType = 'summary' | 'tasks';

export const useAiProcessing = () => {
  const setSummaryStatus = useRecordStore((s) => s.setSummaryStatus);
  const setTasksStatus = useRecordStore((s) => s.setTasksStatus);
  const updateSummary = useRecordStore((s) => s.updateSummary);
  const updateTasks = useRecordStore((s) => s.updateTasks);
  const updateTags = useRecordStore((s) => s.updateTags);
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);

  const inFlightRef = useRef<Set<string>>(new Set());

  const processRecord = useCallback(
    async (record: VoiceRecord, type: ProcessingType): Promise<void> => {
      if (!record.transcript) return;

      const baseId = `${record.id}-ai`;

      if (inFlightRef.current.has(baseId)) {
        return;
      }

      if (type === 'summary') setSummaryStatus(record.id, 'processing');
      if (type === 'tasks') setTasksStatus(record.id, 'processing');

      const requestId = `${baseId}-${Date.now()}`;
      inFlightRef.current.add(baseId);

      try {
        const postResult = await postAiMessage({
          id: requestId,
          transcript: record.transcript,
          model: selectedAIModel,
          systemPrompt: AI_PROCESSING_SYSTEM_PROMPT,
        });

        if (!postResult.ok) {
          if (type === 'summary') setSummaryStatus(record.id, 'error');
          if (type === 'tasks') setTasksStatus(record.id, 'error');
          return;
        }

        const pollResult = await pollAiMessage(requestId, postResult.data.syncToken);

        if (!pollResult.ok) {
          if (type === 'summary') setSummaryStatus(record.id, 'error');
          if (type === 'tasks') setTasksStatus(record.id, 'error');
          return;
        }

        const { summary, tasks: rawTasks, tags } = pollResult.result;

        const taskItems: TaskItem[] = rawTasks.map((t, index) => ({
          id: `${record.id}-task-${index}`,
          text: t.title,
          isDone: false,
        }));

        await updateSummary(record.id, summary);
        await updateTasks(record.id, taskItems);
        if (tags.length > 0) {
          await updateTags(record.id, tags);
        }
      } finally {
        inFlightRef.current.delete(baseId);
      }
    },
    [selectedAIModel, setSummaryStatus, setTasksStatus, updateSummary, updateTasks, updateTags],
  );

  const generateSummary = useCallback(
    (record: VoiceRecord): Promise<void> => processRecord(record, 'summary'),
    [processRecord],
  );

  const extractTasks = useCallback(
    (record: VoiceRecord): Promise<void> => processRecord(record, 'tasks'),
    [processRecord],
  );

  return { generateSummary, extractTasks };
};
