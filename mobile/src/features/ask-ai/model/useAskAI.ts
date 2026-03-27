import { useCallback, useRef, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import { AIOrchestrator } from '@/shared/lib/ai-core';
import { logAnalyticsEvent } from '@/shared/lib/analytics';

export type AskAIHistoryItem = { question: string; answer: string };

export type AskAIState = {
  isLoading: boolean;
  error: string | null;
  question: string | null;
  answer: string | null;
  history: AskAIHistoryItem[];
};

export const useAskAI = () => {
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const summaryStyle = useSettingsStore((s) => s.summaryStyle);
  const taskStrictness = useSettingsStore((s) => s.taskStrictness);
  const aiOutputLanguage = useSettingsStore((s) => s.aiOutputLanguage);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateCapabilityTier = useSettingsStore((s) => s.privateCapabilityTier);
  const [state, setState] = useState<AskAIState>({
    isLoading: false,
    error: null,
    question: null,
    answer: null,
    history: [],
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
      }));
      void logAnalyticsEvent('ai_action_started', {
        action: 'ask',
        mode: aiExecutionMode,
        tier: privateCapabilityTier,
      });

      try {
        const runResult = await AIOrchestrator.runAsk(
          {
            id: requestId,
            transcript: record.transcript,
            question: trimmedQuestion,
            summary: record.summary ?? undefined,
            tasks: record.tasks?.map((t) => ({ text: t.text })) ?? undefined,
          },
          {
            selectedAIModel,
            summaryStyle,
            taskStrictness,
            aiOutputLanguage,
            aiExecutionMode,
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
      summaryStyle,
      taskStrictness,
      aiOutputLanguage,
      aiExecutionMode,
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
