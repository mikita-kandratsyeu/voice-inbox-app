import { useCallback, useRef, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { pollAskResult, postAskQuestion } from '@/shared/lib/ai-api';

export type AskAIState = {
  isLoading: boolean;
  error: string | null;
  question: string | null;
  answer: string | null;
};

export const useAskAI = () => {
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const [state, setState] = useState<AskAIState>({
    isLoading: false,
    error: null,
    question: null,
    answer: null,
  });

  const inFlightRef = useRef(false);

  const askQuestion = useCallback(
    async (record: VoiceRecord, question: string): Promise<void> => {
      if (!record.transcript || !question.trim()) return;
      if (inFlightRef.current) return;

      const requestId = `${record.id}-ask-${Date.now()}`;
      inFlightRef.current = true;
      setState({ isLoading: true, error: null, question: question.trim(), answer: null });

      try {
        const postResult = await postAskQuestion({
          id: requestId,
          transcript: record.transcript,
          question: question.trim(),
          model: selectedAIModel,
        });

        if (!postResult.ok) {
          const errorMsg =
            'limitExceeded' in postResult && postResult.limitExceeded
              ? 'Limit exceeded'
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
          return;
        }

        const pollResult = await pollAskResult(requestId, postResult.data.syncToken);

        if (!pollResult.ok) {
          if (__DEV__)
            console.warn('[AI] askQuestion: pollAskResult failed', {
              recordId: record.id,
              requestId,
              error: pollResult.error,
            });
          setState((s) => ({
            ...s,
            isLoading: false,
            error: pollResult.error,
          }));
          return;
        }

        setState((s) => ({
          ...s,
          isLoading: false,
          error: null,
          answer: pollResult.result.answer,
        }));
      } catch (err) {
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
      } finally {
        inFlightRef.current = false;
      }
    },
    [selectedAIModel],
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, question: null, answer: null });
  }, []);

  return { askQuestion, reset, ...state };
};
