import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { TaskItem, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { mergeManualTasksWithAi } from '@/entities/record/model/mergeManualTasksWithAi';
import { DEFAULT_LOCAL_AI_MODEL_ID, useSettingsStore } from '@/entities/settings';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { getAutoTitleForDate } from '@/screens/record/lib/getAutoTitle';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import { AIOrchestrator } from '@/shared/lib/ai-core';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { logAnalyticsEvent } from '@/shared/lib/analytics';

export const useAiProcessing = () => {
  const {
    setSummaryStatus,
    setTasksStatus,
    setSummaryError,
    setTasksError,
    setPrivateAiBatchUi,
    clearPrivateAiBatchUi,
    updateSummary,
    updateTasks,
    updateTags,
    updateAiExtras,
    renameRecord,
  } = useRecordStore(
    useShallow((s) => ({
      setSummaryStatus: s.setSummaryStatus,
      setTasksStatus: s.setTasksStatus,
      setSummaryError: s.setSummaryError,
      setTasksError: s.setTasksError,
      setPrivateAiBatchUi: s.setPrivateAiBatchUi,
      clearPrivateAiBatchUi: s.clearPrivateAiBatchUi,
      updateSummary: s.updateSummary,
      updateTasks: s.updateTasks,
      updateTags: s.updateTags,
      updateAiExtras: s.updateAiExtras,
      renameRecord: s.renameRecord,
    })),
  );

  const {
    selectedAIModel,
    selectedLocalAiModel,
    localLlmModelStatuses,
    summaryStyle,
    taskStrictness,
    aiOutputLanguage,
    aiExecutionMode,
    privateCapabilityTier,
  } = useSettingsStore(
    useShallow((s) => ({
      selectedAIModel: s.selectedAIModel,
      selectedLocalAiModel: s.selectedLocalAiModel,
      localLlmModelStatuses: s.localLlmModelStatuses,
      summaryStyle: s.summaryStyle,
      taskStrictness: s.taskStrictness,
      aiOutputLanguage: s.aiOutputLanguage,
      aiExecutionMode: s.aiExecutionMode,
      privateCapabilityTier: s.privateCapabilityTier,
    })),
  );

  const effectiveLocalAiModelId = selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID;
  const isLocalLlmModelDownloaded =
    selectedLocalAiModel != null &&
    (localLlmModelStatuses[selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded';

  const inFlightRef = useRef<Set<string>>(new Set());
  const cancelTokensRef = useRef<Map<string, { cancelled: boolean }>>(new Map());
  const privateProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPrivateProgressSimulation = useCallback(() => {
    if (privateProgressIntervalRef.current) {
      clearInterval(privateProgressIntervalRef.current);
      privateProgressIntervalRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopPrivateProgressSimulation();
    },
    [stopPrivateProgressSimulation],
  );

  const startPrivateProgressSimulation = useCallback(
    (recordId: string) => {
      stopPrivateProgressSimulation();
      setPrivateAiBatchUi(recordId, {
        privateAiBatchProgress: 0,
        privateAiBatchPhase: 'loading_model',
      });
      const t0 = Date.now();
      privateProgressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - t0;
        const phase = elapsed < 1200 ? ('loading_model' as const) : ('processing' as const);
        const rec = useRecordStore.getState().records.find((r) => r.id === recordId);
        const prev = rec?.privateAiBatchProgress ?? 0;
        const bump = 2 + Math.floor(Math.random() * 5);
        const next = Math.min(92, prev + bump);
        setPrivateAiBatchUi(recordId, {
          privateAiBatchProgress: next,
          privateAiBatchPhase: phase,
        });
      }, 400);
    },
    [setPrivateAiBatchUi, stopPrivateProgressSimulation],
  );

  const applyCancelledUiState = useCallback(
    (recordId: string) => {
      stopPrivateProgressSimulation();
      clearPrivateAiBatchUi(recordId);
      const latest = useRecordStore.getState().records.find((r) => r.id === recordId);
      const hadSummary = Boolean(latest?.summary?.trim());
      const hadTasks = (latest?.tasks?.length ?? 0) > 0;

      setSummaryStatus(recordId, hadSummary ? 'done' : 'idle');
      setTasksStatus(recordId, hadTasks ? 'done' : 'idle');
      setSummaryError(recordId, undefined);
      setTasksError(recordId, undefined);
    },
    [
      clearPrivateAiBatchUi,
      setSummaryError,
      setSummaryStatus,
      setTasksError,
      setTasksStatus,
      stopPrivateProgressSimulation,
    ],
  );

  const cancelAiGeneration = useCallback(
    (recordId: string) => {
      const token = cancelTokensRef.current.get(recordId);
      if (!token) return;

      token.cancelled = true;
      applyCancelledUiState(recordId);

      if (useSettingsStore.getState().aiExecutionMode === 'private_experimental') {
        void releaseLocalLlmSession();
      }
    },
    [applyCancelledUiState],
  );

  const processRecord = useCallback(
    async (record: VoiceRecord): Promise<void> => {
      const baseId = `${record.id}-ai`;
      const hasTranscript = Boolean(record.transcript?.trim());

      if (!hasTranscript) {
        return;
      }

      if (inFlightRef.current.has(baseId)) {
        return;
      }

      setSummaryStatus(record.id, 'processing');
      setTasksStatus(record.id, 'processing');
      setSummaryError(record.id, undefined);
      setTasksError(record.id, undefined);

      if (aiExecutionMode === 'private_experimental') {
        startPrivateProgressSimulation(record.id);
      }

      const cancelToken = { cancelled: false };
      cancelTokensRef.current.set(record.id, cancelToken);

      const requestId = `${baseId}-${Date.now()}`;
      inFlightRef.current.add(baseId);
      void logAnalyticsEvent('ai_action_started', {
        action: 'summary_tasks',
        mode: aiExecutionMode,
        tier: privateCapabilityTier,
      });

      try {
        const runResult = await AIOrchestrator.runSummaryTasks(
          { id: requestId, transcript: record.transcript },
          {
            selectedAIModel,
            selectedLocalAiModel: effectiveLocalAiModelId,
            isLocalLlmModelDownloaded,
            summaryStyle,
            taskStrictness,
            aiOutputLanguage,
            aiExecutionMode,
            privateCapabilityTier,
          },
        );

        if (cancelToken.cancelled) {
          applyCancelledUiState(record.id);
          void logAnalyticsEvent('ai_action_cancelled', {
            action: 'summary_tasks',
            mode: aiExecutionMode,
            tier: privateCapabilityTier,
          });
          return;
        }

        if (!runResult.ok) {
          const errorMsg = runResult.limitExceeded
            ? getAiWeeklyLimitExceededMessage()
            : runResult.error;
          if (__DEV__)
            console.warn('[AI] processRecord: runSummaryTasks failed', {
              recordId: record.id,
              error: errorMsg,
              limitExceeded: runResult.limitExceeded,
              provider: runResult.provider,
              mode: runResult.mode,
              tier: privateCapabilityTier,
            });
          setSummaryStatus(record.id, 'error');
          setTasksStatus(record.id, 'error');
          setSummaryError(record.id, errorMsg);
          setTasksError(record.id, errorMsg);
          void logAnalyticsEvent('ai_action_failed', {
            action: 'summary_tasks',
            reason: runResult.limitExceeded ? 'limit' : 'run',
            mode: runResult.mode,
            provider: runResult.provider,
            tier: privateCapabilityTier,
          });
          return;
        }

        if (aiExecutionMode === 'private_experimental') {
          setPrivateAiBatchUi(record.id, {
            privateAiBatchProgress: 100,
            privateAiBatchPhase: 'processing',
          });
        }

        const {
          summary,
          suggestedTitle,
          tasks: rawTasks,
          tags,
          classification,
          keyPhrases,
          nextSteps,
        } = runResult.result;

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
        void logAnalyticsEvent('ai_action_success', {
          action: 'summary_tasks',
          mode: runResult.mode,
          provider: runResult.provider,
          tier: privateCapabilityTier,
        });
      } catch (err) {
        if (cancelToken.cancelled) {
          applyCancelledUiState(record.id);
          void logAnalyticsEvent('ai_action_cancelled', {
            action: 'summary_tasks',
            mode: aiExecutionMode,
            tier: privateCapabilityTier,
          });
          return;
        }
        if (__DEV__)
          console.warn('[AI] processRecord: unexpected error', {
            recordId: record.id,
            error: err instanceof Error ? err.message : String(err),
          });
        setSummaryStatus(record.id, 'error');
        setTasksStatus(record.id, 'error');
        const errorMsg = err instanceof Error ? err.message : String(err);
        setSummaryError(record.id, errorMsg);
        setTasksError(record.id, errorMsg);
        void logAnalyticsEvent('ai_action_failed', {
          action: 'summary_tasks',
          reason: 'exception',
          mode: aiExecutionMode,
          tier: privateCapabilityTier,
        });
      } finally {
        stopPrivateProgressSimulation();
        clearPrivateAiBatchUi(record.id);
        inFlightRef.current.delete(baseId);
        cancelTokensRef.current.delete(record.id);
      }
    },
    [
      aiExecutionMode,
      clearPrivateAiBatchUi,
      selectedAIModel,
      effectiveLocalAiModelId,
      isLocalLlmModelDownloaded,
      summaryStyle,
      taskStrictness,
      aiOutputLanguage,
      privateCapabilityTier,
      applyCancelledUiState,
      setPrivateAiBatchUi,
      startPrivateProgressSimulation,
      stopPrivateProgressSimulation,
      setSummaryStatus,
      setTasksStatus,
      setSummaryError,
      setTasksError,
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

  return { generateSummary, extractTasks, processRecord, cancelAiGeneration };
};
