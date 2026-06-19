import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
import { hapticLight } from '@/shared/lib';

import { subscribeShake } from '../lib/subscribeShake';

type UseShakeToCancelAskAiOptions = {
  enabled: boolean;
  isLoading: boolean;
  onCancel: () => void;
};

export function useShakeToCancelAskAi({
  enabled,
  isLoading,
  onCancel,
}: UseShakeToCancelAskAiOptions): void {
  const shakeToCancelAskAiEnabled = useSettingsStore((s) => s.shakeToCancelAskAiEnabled);

  const handleShake = useCallback(() => {
    if (!enabled || !shakeToCancelAskAiEnabled || !isLoading) {
      return;
    }

    if (AppState.currentState !== 'active') {
      return;
    }

    hapticLight();
    onCancel();
  }, [enabled, isLoading, onCancel, shakeToCancelAskAiEnabled]);

  useEffect(() => {
    if (!enabled || !shakeToCancelAskAiEnabled || !isLoading) {
      return;
    }

    return subscribeShake(handleShake);
  }, [enabled, handleShake, isLoading, shakeToCancelAskAiEnabled]);
}
