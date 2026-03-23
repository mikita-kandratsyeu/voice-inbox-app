import { useCallback, useRef, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { pollAskResult, postAskQuestion } from '@/shared/lib/ai-api';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
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
      void logAnalyticsEvent('ai_action_started', { action: 'ask' });

      try {
        const postResult = await postAskQuestion({
          id: requestId,
          transcript: record.transcript,
          question: trimmedQuestion,
          model: selectedAIModel,
          summary: record.summary ?? undefined,
          tasks: record.tasks?.map((t) => ({ text: t.text })) ?? undefined,
        });

        if (!postResult.ok) {
          const errorMsg =
            'limitExceeded' in postResult && postResult.limitExceeded
              ? getAiWeeklyLimitExceededMessage()
              : postResult.error;
          if (__DEV__)
            console.warn('[AI] askQuestion: postAskQuestion failed', {
              recordId: record.id,
              error: errorMsg,
            });
          setState((s) => ({
            ...s,
            isLoading: false,
            error: errorMsg,
          }));
          void logAnalyticsEvent('ai_action_failed', {
            action: 'ask',
            reason: 'limitExceeded' in postResult && postResult.limitExceeded ? 'limit' : 'post',
          });
          return;
        }

        const pollResult = await pollAskResult(requestId, postResult.data.syncToken);

        if (!pollResult.ok) {
          if (__DEV__)
            console.warn('[AI] askQuestion: pollAskResult failed', {
              requestId,
              error: pollResult.error,
            });
          setState((s) => ({
            ...s,
            isLoading: false,
            error: pollResult.error,
          }));
          void logAnalyticsEvent('ai_action_failed', { action: 'ask', reason: 'poll' });
          return;
        }

        setState((s) => ({
          ...s,
          isLoading: false,
          error: null,
          answer: pollResult.result.answer,
        }));
        void logAnalyticsEvent('ai_action_success', { action: 'ask' });
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
        void logAnalyticsEvent('ai_action_failed', { action: 'ask', reason: 'exception' });
      } finally {
        inFlightRef.current = false;
      }
    },
    [selectedAIModel],
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
