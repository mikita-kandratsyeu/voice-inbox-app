import { useEffect } from 'react';

import { useSettingsStore } from '@/entities/settings';
import { DEFAULT_ACCENT_COLOR_ID } from '@/shared/config';

import { useProEntitlement } from './useProEntitlement';

export function useResetAccentWhenNotPro(): void {
  const { isProActive } = useProEntitlement();
  const accentColorId = useSettingsStore((s) => s.accentColorId);
  const setAccentColorId = useSettingsStore((s) => s.setAccentColorId);

  useEffect(() => {
    if (!isProActive && accentColorId !== DEFAULT_ACCENT_COLOR_ID) {
      setAccentColorId(DEFAULT_ACCENT_COLOR_ID);
    }
  }, [isProActive, accentColorId, setAccentColorId]);
}
