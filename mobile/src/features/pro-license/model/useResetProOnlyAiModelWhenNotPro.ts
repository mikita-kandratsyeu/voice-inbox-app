import { useEffect, useRef } from 'react';

import { RECOMMENDED_AI_MODEL_ID, useSettingsStore } from '@/entities/settings';

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
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const setAiModelRoutingMode = useSettingsStore((s) => s.setAiModelRoutingMode);
  const prevIsProActiveRef = useRef(isProActive);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const hadPro = prevIsProActiveRef.current;
    prevIsProActiveRef.current = isProActive;

    if (isProActive || !hadPro) {
      return;
    }

    const t = setTimeout(() => {
      if (isProActiveFromStorageSync()) {
        return;
      }

      const { selectedAIModel, aiModelRoutingMode } = useSettingsStore.getState();
      if (aiModelRoutingMode !== 'auto') {
        setAiModelRoutingMode('auto');
      }
      if (selectedAIModel !== RECOMMENDED_AI_MODEL_ID) {
        setAIModel(RECOMMENDED_AI_MODEL_ID);
      }
    }, RESET_MODEL_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [enabled, isProActive, setAIModel, setAiModelRoutingMode]);
}
