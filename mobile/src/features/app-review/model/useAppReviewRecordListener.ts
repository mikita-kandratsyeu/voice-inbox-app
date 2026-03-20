import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useRecordStore } from '@/entities/record';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';

import { markSoftPromptPresented } from '../lib/appReviewStorage';
import { SOFT_PROMPT_DELAY_MS } from '../lib/constants';
import { evaluateSoftPromptEligibility } from './evaluateSoftPromptEligibility';

export type AppReviewPromptController = {
  softPromptVisible: boolean;
  dismissSoftPrompt: () => void;
};

export function useAppReviewRecordListener(): AppReviewPromptController {
  const [softPromptVisible, setSoftPromptVisible] = useState(false);
  const prevCountRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissSoftPrompt = useCallback(() => {
    setSoftPromptVisible(false);
  }, []);

  useEffect(() => {
    const { records, isLoaded } = useRecordStore.getState();
    if (isLoaded) {
      prevCountRef.current = records.length;
    }

    const unsub = useRecordStore.subscribe((state) => {
      if (!state.isLoaded) {
        return;
      }

      const prev = prevCountRef.current;
      const next = state.records.length;
      prevCountRef.current = next;

      if (prev === null) {
        return;
      }

      const delta = next - prev;
      if (!getHasSeenOnboarding()) {
        return;
      }

      if (!evaluateSoftPromptEligibility({ recordDelta: delta, recordCount: next })) {
        return;
      }

      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }

      delayTimerRef.current = setTimeout(() => {
        delayTimerRef.current = null;

        if (AppState.currentState !== 'active') {
          return;
        }

        markSoftPromptPresented();
        setSoftPromptVisible(true);
      }, SOFT_PROMPT_DELAY_MS);
    });

    return () => {
      unsub();
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, []);

  return { softPromptVisible, dismissSoftPrompt };
}
