import { useCallback, useEffect, useRef } from 'react';

import { useSettingsStore } from '@/entities/settings';

import { isProActiveFromStorageSync } from '../lib/proEntitlementStorage';
import { useProEntitlement } from './useProEntitlement';

const RESET_PRIVATE_SERVER_DEBOUNCE_MS = 750;

type UseResetPrivateAiServerWhenNotProOptions = {
  enabled?: boolean;
};

function resetPrivateAiServerIfNeeded(setPrivateAiProvider: (value: 'local') => void): void {
  if (isProActiveFromStorageSync()) return;

  const { privateAiProvider } = useSettingsStore.getState();
  if (privateAiProvider === 'custom_openai') {
    setPrivateAiProvider('local');
  }
}

export function useResetPrivateAiServerWhenNotPro(
  options?: UseResetPrivateAiServerWhenNotProOptions,
): void {
  const enabled = options?.enabled !== false;
  const { isProActive } = useProEntitlement();
  const setPrivateAiProvider = useSettingsStore((s) => s.setPrivateAiProvider);
  const prevIsProActiveRef = useRef(isProActive);

  const applyIfNeeded = useCallback(() => {
    resetPrivateAiServerIfNeeded(setPrivateAiProvider);
  }, [setPrivateAiProvider]);

  useEffect(() => {
    if (!enabled) return;
    if (isProActive) {
      prevIsProActiveRef.current = true;
      return;
    }
    applyIfNeeded();
  }, [applyIfNeeded, enabled, isProActive]);

  useEffect(() => {
    if (!enabled) return;

    const hadPro = prevIsProActiveRef.current;
    prevIsProActiveRef.current = isProActive;

    if (isProActive || !hadPro) return;

    const timer = setTimeout(applyIfNeeded, RESET_PRIVATE_SERVER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [applyIfNeeded, enabled, isProActive]);
}
