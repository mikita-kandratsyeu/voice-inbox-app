import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useRecordStore } from '@/entities/record';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';

import { markSoftPromptPresented } from '../lib/appReviewStorage';
import { SOFT_PROMPT_DELAY_MS } from '../lib/constants';
import { requestNativeInAppReview } from '../lib/requestNativeInAppReview';
import { evaluateSoftPromptEligibility } from './evaluateSoftPromptEligibility';

export function useAppReviewRecordListener(): void {
  const prevCountRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        void requestNativeInAppReview();
      }, SOFT_PROMPT_DELAY_MS);
    });

    return () => {
      unsub();
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, []);
}
