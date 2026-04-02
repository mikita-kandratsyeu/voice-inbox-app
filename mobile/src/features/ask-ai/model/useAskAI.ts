import { useCallback, useRef, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { DEFAULT_LOCAL_AI_MODEL_ID, useSettingsStore } from '@/entities/settings';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import { AIOrchestrator } from '@/shared/lib/ai-core';
import type { AiLocalGenerationProgressEvent } from '@/shared/lib/ai-core/types';
import { logAnalyticsEvent } from '@/shared/lib/analytics';

export type AskAIHistoryItem = { question: string; answer: string };

export type AskAIState = {
  isLoading: boolean;
  error: string | null;
  question: string | null;
  answer: string | null;
  history: AskAIHistoryItem[];
  privateAskProgress: number;
  privateAskPhase: 'loading_model' | 'processing';
};

export const useAskAI = () => {
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);
  const localLlmModelStatuses = useSettingsStore((s) => s.localLlmModelStatuses);
  const summaryStyle = useSettingsStore((s) => s.summaryStyle);
  const taskStrictness = useSettingsStore((s) => s.taskStrictness);
  const aiOutputLanguage = useSettingsStore((s) => s.aiOutputLanguage);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateLocalLlmBudget = useSettingsStore((s) => s.privateLocalLlmBudget);
  const privateCapabilityTier = useSettingsStore((s) => s.privateCapabilityTier);
  const effectiveLocalAiModelId = selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID;
  const isLocalLlmModelDownloaded =
    selectedLocalAiModel != null &&
    (localLlmModelStatuses[selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded';
  const [state, setState] = useState<AskAIState>({
    isLoading: false,
    error: null,
    question: null,
    answer: null,
    history: [],
    privateAskProgress: 0,
    privateAskPhase: 'loading_model',
  });

  const inFlightRef = useRef(false);

  const askQuestion = useCallback(
    async (record: VoiceRecord, question: string): Promise<void> => {
      if (!record.transcript || !question.trim()) return;
      if (inFlightRef.current) return;

      const requestId = `${record.id}-ask-${Date.now()}`;
      const trimmedQuestion = question.trim();
      inFlightRef.current = true;
      setState((s) => ({
        ...s,
        isLoading: true,
        error: null,
        question: trimmedQuestion,
        answer: null,
        privateAskProgress: aiExecutionMode === 'private_experimental' ? 0 : s.privateAskProgress,
        privateAskPhase: 'loading_model',
      }));
      void logAnalyticsEvent('ai_action_started', {
        action: 'ask',
        mode: aiExecutionMode,
        tier: privateCapabilityTier,
      });

      const onLocalGenerationProgress =
        aiExecutionMode === 'private_experimental'
          ? (event: AiLocalGenerationProgressEvent) => {
              let pct = 0;
              let phase: 'loading_model' | 'processing' = 'loading_model';
              switch (event.kind) {
                case 'prepare_model_start':
                  pct = 2;
                  phase = 'loading_model';
                  break;
                case 'prepare_model_done':
                  pct = 12;
                  phase = 'processing';
                  break;
                case 'completion_token': {
                  phase = 'processing';
                  const genFrac = event.tokenIndex / event.nPredictBudget;
                  pct = 12 + Math.min(82, Math.floor(genFrac * 82));
                  break;
                }
                default:
                  return;
              }
              setState((s) => ({
                ...s,
                privateAskProgress: Math.min(98, pct),
                privateAskPhase: phase,
              }));
            }
          : undefined;

      try {
        const runResult = await AIOrchestrator.runAsk(
          {
            id: requestId,
            transcript: record.transcript,
            question: trimmedQuestion,
            summary: record.summary ?? undefined,
            tasks: record.tasks?.map((t) => ({ text: t.text })) ?? undefined,
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

        if (!runResult.ok) {
          const errorMsg = runResult.limitExceeded
            ? getAiWeeklyLimitExceededMessage()
            : runResult.error;
          if (__DEV__)
            console.warn('[AI] askQuestion: runAsk failed', {
              recordId: record.id,
              error: errorMsg,
              limitExceeded: runResult.limitExceeded,
              provider: runResult.provider,
              mode: runResult.mode,
              tier: privateCapabilityTier,
            });
          setState((s) => ({
            ...s,
            isLoading: false,
            error: errorMsg,
            privateAskProgress: 0,
            privateAskPhase: 'loading_model',
          }));
          void logAnalyticsEvent('ai_action_failed', {
            action: 'ask',
            reason: runResult.limitExceeded ? 'limit' : 'run',
            mode: runResult.mode,
            provider: runResult.provider,
            tier: privateCapabilityTier,
          });
          return;
        }

        setState((s) => ({
          ...s,
          isLoading: false,
          error: null,
          answer: runResult.result.answer,
          privateAskProgress: 0,
          privateAskPhase: 'loading_model',
        }));
        void logAnalyticsEvent('ai_action_success', {
          action: 'ask',
          mode: runResult.mode,
          provider: runResult.provider,
          tier: privateCapabilityTier,
        });
      } catch (err: unknown) {
        if (__DEV__)
          console.warn('[AI] askQuestion: unexpected error', {
            recordId: record.id,
            error: err instanceof Error ? err.message : String(err),
          });
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          privateAskProgress: 0,
          privateAskPhase: 'loading_model',
        }));
        void logAnalyticsEvent('ai_action_failed', {
          action: 'ask',
          reason: 'exception',
          mode: aiExecutionMode,
          tier: privateCapabilityTier,
        });
      } finally {
        inFlightRef.current = false;
      }
    },
    [
      selectedAIModel,
      effectiveLocalAiModelId,
      isLocalLlmModelDownloaded,
      summaryStyle,
      taskStrictness,
      aiOutputLanguage,
      aiExecutionMode,
      privateLocalLlmBudget,
      privateCapabilityTier,
    ],
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      question: null,
      answer: null,
      history: [],
      privateAskProgress: 0,
      privateAskPhase: 'loading_model',
    });
  }, []);

  const askAnother = useCallback(() => {
    setState((s) => {
      const newHistory =
        s.question && s.answer
          ? [...s.history, { question: s.question, answer: s.answer }]
          : s.history;
      return {
        ...s,
        question: null,
        answer: null,
        history: newHistory,
      };
    });
  }, []);

  return { askQuestion, reset, askAnother, ...state };
};
