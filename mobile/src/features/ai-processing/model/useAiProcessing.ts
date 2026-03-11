import { useCallback, useRef } from 'react';

import type { TaskItem, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { AI_PROCESSING_SYSTEM_PROMPT, pollAiMessage, postAiMessage } from '@/shared/lib/ai-api';

export const useAiProcessing = () => {
  const setSummaryStatus = useRecordStore((s) => s.setSummaryStatus);
  const setTasksStatus = useRecordStore((s) => s.setTasksStatus);
  const updateSummary = useRecordStore((s) => s.updateSummary);
  const updateTasks = useRecordStore((s) => s.updateTasks);
  const updateTags = useRecordStore((s) => s.updateTags);
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);

  const inFlightRef = useRef<Set<string>>(new Set());

  const processRecord = useCallback(
    async (record: VoiceRecord): Promise<void> => {
      if (!record.transcript) return;

      const baseId = `${record.id}-ai`;

      if (inFlightRef.current.has(baseId)) {
        return;
      }

      setSummaryStatus(record.id, 'processing');
      setTasksStatus(record.id, 'processing');

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
          const errorMsg =
            'limitExceeded' in postResult && postResult.limitExceeded
              ? 'Limit exceeded'
              : postResult.error;
          console.warn('[AI] processRecord: postAiMessage failed', {
            recordId: record.id,
            error: errorMsg,
            limitExceeded: 'limitExceeded' in postResult && postResult.limitExceeded,
          });
          setSummaryStatus(record.id, 'error');
          setTasksStatus(record.id, 'error');
          return;
        }

        const pollResult = await pollAiMessage(requestId, postResult.data.syncToken);

        if (!pollResult.ok) {
          console.warn('[AI] processRecord: pollAiMessage failed', {
            recordId: record.id,
            requestId,
            error: pollResult.error,
          });
          setSummaryStatus(record.id, 'error');
          setTasksStatus(record.id, 'error');
          return;
        }

        const { summary, tasks: rawTasks, tags } = pollResult.result;

        const taskItems: TaskItem[] = rawTasks.map((t, index) => ({
          id: `${record.id}-task-${index}`,
          text: t.title,
          isDone: false,
          deadline: t.deadline ?? undefined,
          priority: t.priority,
        }));

        await updateSummary(record.id, summary);
        await updateTasks(record.id, taskItems);
        if (tags.length > 0) {
          await updateTags(record.id, tags);
        }
      } catch (err) {
        console.warn('[AI] processRecord: unexpected error', {
          recordId: record.id,
          error: err instanceof Error ? err.message : String(err),
        });
        setSummaryStatus(record.id, 'error');
        setTasksStatus(record.id, 'error');
      } finally {
        inFlightRef.current.delete(baseId);
      }
    },
    [selectedAIModel, setSummaryStatus, setTasksStatus, updateSummary, updateTasks, updateTags],
  );

  const generateSummary = useCallback(
    (record: VoiceRecord): Promise<void> => processRecord(record),
    [processRecord],
  );

  const extractTasks = useCallback(
    (record: VoiceRecord): Promise<void> => processRecord(record),
    [processRecord],
  );

  return { generateSummary, extractTasks, processRecord };
};
