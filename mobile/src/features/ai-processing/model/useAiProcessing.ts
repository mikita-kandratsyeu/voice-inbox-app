import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { TaskItem, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { mergeManualTasksWithAi } from '@/entities/record/model/mergeManualTasksWithAi';
import { useSettingsStore } from '@/entities/settings';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { getAutoTitleForDate } from '@/screens/record/lib/getAutoTitle';
import { pollAiMessage, postAiMessage } from '@/shared/lib/ai-api';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import { logAnalyticsEvent } from '@/shared/lib/analytics';

export const useAiProcessing = () => {
  const {
    setSummaryStatus,
    setTasksStatus,
    updateSummary,
    updateTasks,
    updateTags,
    updateAiExtras,
    renameRecord,
  } = useRecordStore(
    useShallow((s) => ({
      setSummaryStatus: s.setSummaryStatus,
      setTasksStatus: s.setTasksStatus,
      updateSummary: s.updateSummary,
      updateTasks: s.updateTasks,
      updateTags: s.updateTags,
      updateAiExtras: s.updateAiExtras,
      renameRecord: s.renameRecord,
    })),
  );

  const { selectedAIModel, summaryStyle, taskStrictness, aiOutputLanguage } = useSettingsStore(
    useShallow((s) => ({
      selectedAIModel: s.selectedAIModel,
      summaryStyle: s.summaryStyle,
      taskStrictness: s.taskStrictness,
      aiOutputLanguage: s.aiOutputLanguage,
    })),
  );

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
      void logAnalyticsEvent('ai_action_started', { action: 'summary_tasks' });

      try {
        const postResult = await postAiMessage({
          id: requestId,
          transcript: record.transcript,
          model: selectedAIModel,
          options: {
            summaryStyle,
            taskStrictness,
            outputLanguage: aiOutputLanguage,
          },
        });

        if (!postResult.ok) {
          const errorMsg =
            'limitExceeded' in postResult && postResult.limitExceeded
              ? getAiWeeklyLimitExceededMessage()
              : postResult.error;
          if (__DEV__)
            console.warn('[AI] processRecord: postAiMessage failed', {
              recordId: record.id,
              error: errorMsg,
              limitExceeded: 'limitExceeded' in postResult && postResult.limitExceeded,
            });
          setSummaryStatus(record.id, 'error');
          setTasksStatus(record.id, 'error');
          void logAnalyticsEvent('ai_action_failed', {
            action: 'summary_tasks',
            reason: 'limitExceeded' in postResult && postResult.limitExceeded ? 'limit' : 'post',
          });
          return;
        }

        const pollResult = await pollAiMessage(requestId, postResult.data.syncToken);

        if (!pollResult.ok) {
          if (__DEV__)
            console.warn('[AI] processRecord: pollAiMessage failed', {
              recordId: record.id,
              requestId,
              error: pollResult.error,
            });
          setSummaryStatus(record.id, 'error');
          setTasksStatus(record.id, 'error');
          void logAnalyticsEvent('ai_action_failed', {
            action: 'summary_tasks',
            reason: 'poll',
          });
          return;
        }

        const {
          summary,
          suggestedTitle,
          tasks: rawTasks,
          tags,
          classification,
          keyPhrases,
          nextSteps,
        } = pollResult.result;

        const aiTaskItems: TaskItem[] = rawTasks.map((t, index) => ({
          id: `${record.id}-task-${index}`,
          text: t.title,
          isDone: false,
          deadline: t.deadline ?? undefined,
          priority: t.priority,
          source: 'ai',
        }));

        const latest = useRecordStore.getState().records.find((r) => r.id === record.id);
        const mergedTasks = mergeManualTasksWithAi(latest?.tasks, aiTaskItems);

        await updateSummary(record.id, summary);
        await updateTasks(record.id, mergedTasks);

        if (suggestedTitle?.trim()) {
          const currentRecord = useRecordStore.getState().records.find((r) => r.id === record.id);
          if (currentRecord) {
            const standardTitle = getAutoTitleForDate(currentRecord.createdAt);
            if (currentRecord.title === standardTitle) {
              await renameRecord(record.id, suggestedTitle.trim());
            }
          }
        }
        if (tags.length > 0) {
          await updateTags(record.id, tags);
        }
        if (
          classification ||
          (keyPhrases && keyPhrases.length > 0) ||
          (nextSteps && nextSteps.length > 0)
        ) {
          await updateAiExtras(record.id, {
            classification: classification ?? null,
            keyPhrases: keyPhrases ?? [],
            nextSteps: nextSteps ?? [],
          });
        }

        await generateAndSaveEmbeddingForRecord({
          ...record,
          summary,
          keyPhrases: keyPhrases ?? [],
        });
        void logAnalyticsEvent('ai_action_success', { action: 'summary_tasks' });
      } catch (err) {
        if (__DEV__)
          console.warn('[AI] processRecord: unexpected error', {
            recordId: record.id,
            error: err instanceof Error ? err.message : String(err),
          });
        setSummaryStatus(record.id, 'error');
        setTasksStatus(record.id, 'error');
        void logAnalyticsEvent('ai_action_failed', {
          action: 'summary_tasks',
          reason: 'exception',
        });
      } finally {
        inFlightRef.current.delete(baseId);
      }
    },
    [
      selectedAIModel,
      summaryStyle,
      taskStrictness,
      aiOutputLanguage,
      setSummaryStatus,
      setTasksStatus,
      updateSummary,
      updateTasks,
      updateTags,
      updateAiExtras,
      renameRecord,
    ],
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
