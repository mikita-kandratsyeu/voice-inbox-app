import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { TaskItem, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { mergeManualTasksWithAi } from '@/entities/record/model/mergeManualTasksWithAi';
import {
  buildNormalizedTextSet,
  collectExistingTaskTextsForAiPrompt,
  filterAiTaskItemsByNormalizedSet,
  filterNextStepsByNormalizedTaskSet,
  normalizedManualTaskTextSet,
} from '@/entities/record/model/taskTextDedupe';
import { DEFAULT_LOCAL_AI_MODEL_ID, useSettingsStore } from '@/entities/settings';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { getAutoTitleForDate } from '@/screens/record/lib/getAutoTitle';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import { AIOrchestrator } from '@/shared/lib/ai-core';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import type { AiLocalGenerationProgressEvent } from '@/shared/lib/ai-core/types';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import {
  toUserFacingFetchErrorFromUnknown,
  toUserFacingFetchErrorMessage,
} from '@/shared/lib/fetch/userFacingFetchError';

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
    privateLocalLlmBudget,
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
      privateLocalLlmBudget: s.privateLocalLlmBudget,
      privateCapabilityTier: s.privateCapabilityTier,
    })),
  );

  const effectiveLocalAiModelId = selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID;
  const isLocalLlmModelDownloaded =
    selectedLocalAiModel != null &&
    (localLlmModelStatuses[selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded';

  const inFlightRef = useRef<Set<string>>(new Set());
  const cancelTokensRef = useRef<Map<string, { cancelled: boolean }>>(new Map());

  const applyCancelledUiState = useCallback(
    (recordId: string) => {
      clearPrivateAiBatchUi(recordId);
      const latest = useRecordStore.getState().records.find((r) => r.id === recordId);
      const hadSummary = Boolean(latest?.summary?.trim());
      const hadTasks = (latest?.tasks?.length ?? 0) > 0;

      setSummaryStatus(recordId, hadSummary ? 'done' : 'idle');
      setTasksStatus(recordId, hadTasks ? 'done' : 'idle');
      setSummaryError(recordId, undefined);
      setTasksError(recordId, undefined);
    },
    [clearPrivateAiBatchUi, setSummaryError, setSummaryStatus, setTasksError, setTasksStatus],
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
        setPrivateAiBatchUi(record.id, {
          privateAiBatchProgress: 0,
          privateAiBatchPhase: 'loading_model',
        });
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
        const snapshot = useRecordStore.getState().records.find((r) => r.id === record.id);
        const existingTaskTexts = collectExistingTaskTextsForAiPrompt(snapshot?.tasks);

        const privateBatchProgress = {
          lastDisplayedPct: -1,
          tokenEvents: 0,
          retryContinuationFloor: null as number | null,
        };
        const onLocalGenerationProgress =
          aiExecutionMode === 'private_experimental'
            ? (event: AiLocalGenerationProgressEvent) => {
                if (cancelToken.cancelled) return;
                let pct = 0;
                let phase: 'loading_model' | 'processing' = 'loading_model';
                switch (event.kind) {
                  case 'prepare_model_start':
                    if (privateBatchProgress.tokenEvents > 0) {
                      privateBatchProgress.retryContinuationFloor =
                        privateBatchProgress.lastDisplayedPct;
                    }
                    if (privateBatchProgress.retryContinuationFloor != null) {
                      pct = privateBatchProgress.retryContinuationFloor;
                      phase = 'processing';
                    } else {
                      pct = 2;
                      phase = 'loading_model';
                    }
                    break;
                  case 'prepare_model_done':
                    phase = 'processing';
                    if (privateBatchProgress.retryContinuationFloor != null) {
                      pct = Math.max(12, privateBatchProgress.retryContinuationFloor);
                    } else {
                      pct = 12;
                    }
                    break;
                  case 'completion_token': {
                    phase = 'processing';
                    privateBatchProgress.tokenEvents += 1;
                    const genFrac = event.tokenIndex / event.nPredictBudget;
                    if (privateBatchProgress.retryContinuationFloor != null) {
                      const span = 98 - privateBatchProgress.retryContinuationFloor;
                      pct =
                        privateBatchProgress.retryContinuationFloor +
                        Math.min(span, Math.floor(genFrac * span));
                    } else {
                      pct = 12 + Math.min(82, Math.floor(genFrac * 82));
                    }
                    break;
                  }
                  default:
                    return;
                }
                const nextPct = Math.min(98, pct);
                privateBatchProgress.lastDisplayedPct = nextPct;
                setPrivateAiBatchUi(record.id, {
                  privateAiBatchProgress: nextPct,
                  privateAiBatchPhase: phase,
                });
              }
            : undefined;

        const runResult = await AIOrchestrator.runSummaryTasks(
          {
            id: requestId,
            transcript: record.transcript,
            existingTaskTexts,
            onLocalGenerationProgress,
          },
          {
            selectedAIModel,
            selectedLocalAiModel: effectiveLocalAiModelId,
            isLocalLlmModelDownloaded,
            summaryStyle,
            taskStrictness,
            aiOutputLanguage,
            aiExecutionMode,
            privateLocalLlmBudget,
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
            : toUserFacingFetchErrorMessage(runResult.error ?? '');
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
        const manualNorm = normalizedManualTaskTextSet(latest?.tasks);
        const aiTaskItemsFiltered = filterAiTaskItemsByNormalizedSet(aiTaskItems, manualNorm);
        const mergedTasks = mergeManualTasksWithAi(latest?.tasks, aiTaskItemsFiltered);
        const taskNormMerged = buildNormalizedTextSet(mergedTasks.map((x) => x.text));
        const rawNextSteps = nextSteps ?? [];
        const nextStepsForStore = filterNextStepsByNormalizedTaskSet(rawNextSteps, taskNormMerged);

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
          rawNextSteps.length > 0 ||
          nextStepsForStore.length > 0
        ) {
          await updateAiExtras(record.id, {
            classification: classification ?? null,
            keyPhrases: keyPhrases ?? [],
            nextSteps: nextStepsForStore,
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
        const errorMsg = toUserFacingFetchErrorFromUnknown(err);
        setSummaryError(record.id, errorMsg);
        setTasksError(record.id, errorMsg);
        void logAnalyticsEvent('ai_action_failed', {
          action: 'summary_tasks',
          reason: 'exception',
          mode: aiExecutionMode,
          tier: privateCapabilityTier,
        });
      } finally {
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
      privateLocalLlmBudget,
      privateCapabilityTier,
      applyCancelledUiState,
      setPrivateAiBatchUi,
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
