import { useEffect } from 'react';

import { useSettingsStore } from '@/entities/settings';
import { DEFAULT_ACCENT_COLOR_ID } from '@/shared/config';

import { isProActiveFromStorageSync } from '../lib/proEntitlementStorage';
import { useProEntitlement } from './useProEntitlement';

const RESET_ACCENT_DEBOUNCE_MS = 750;

type UseResetAccentWhenNotProOptions = {
  enabled?: boolean;
};

export function useResetAccentWhenNotPro(options?: UseResetAccentWhenNotProOptions): void {
  const enabled = options?.enabled !== false;
  const { isProActive } = useProEntitlement();
  const accentColorId = useSettingsStore((s) => s.accentColorId);
  const setAccentColorId = useSettingsStore((s) => s.setAccentColorId);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (accentColorId === DEFAULT_ACCENT_COLOR_ID || isProActive) {
      return;
    }

    const t = setTimeout(() => {
      const storagePro = isProActiveFromStorageSync();
      const currentAccent = useSettingsStore.getState().accentColorId;
      if (!storagePro && currentAccent !== DEFAULT_ACCENT_COLOR_ID) {
        setAccentColorId(DEFAULT_ACCENT_COLOR_ID);
      }
    }, RESET_ACCENT_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [enabled, isProActive, accentColorId, setAccentColorId]);
}
