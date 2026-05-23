import { useEffect } from 'react';

import {
  FALLBACK_AI_MODEL_WHEN_NOT_PRO,
  isProOnlyAiModel,
  useSettingsStore,
} from '@/entities/settings';

import { isProActiveFromStorageSync } from '../lib/proEntitlementStorage';
import { useProEntitlement } from './useProEntitlement';

const RESET_MODEL_DEBOUNCE_MS = 750;

type UseResetProOnlyAiModelWhenNotProOptions = {
  enabled?: boolean;
};

export function useResetProOnlyAiModelWhenNotPro(
  options?: UseResetProOnlyAiModelWhenNotProOptions,
): void {
  const enabled = options?.enabled !== false;
  const { isProActive } = useProEntitlement();
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const setAIModel = useSettingsStore((s) => s.setAIModel);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (isProActive || aiModelRoutingMode === 'auto' || !isProOnlyAiModel(selectedAIModel)) {
      return;
    }

    const t = setTimeout(() => {
      const storagePro = isProActiveFromStorageSync();
      const { selectedAIModel: currentModel, aiModelRoutingMode: routingMode } =
        useSettingsStore.getState();
      if (
        !storagePro &&
        routingMode === 'manual' &&
        isProOnlyAiModel(currentModel) &&
        currentModel !== FALLBACK_AI_MODEL_WHEN_NOT_PRO
      ) {
        setAIModel(FALLBACK_AI_MODEL_WHEN_NOT_PRO);
      }
    }, RESET_MODEL_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [enabled, isProActive, aiModelRoutingMode, selectedAIModel, setAIModel]);
}
