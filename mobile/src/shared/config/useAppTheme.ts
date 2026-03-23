import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/entities/settings';

import type { Colors, ColorScheme } from './colors';
import { getColors } from './colors';

export function useAppTheme(): ColorScheme {
  const appTheme = useSettingsStore((s) => s.appTheme);
  const systemScheme = useColorScheme();

  if (appTheme === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return appTheme;
}

export function useColors(): Colors {
  const scheme = useAppTheme();
  const accentColorId = useSettingsStore((s) => s.accentColorId);
  return useMemo(() => getColors(scheme, accentColorId), [scheme, accentColorId]);
}
