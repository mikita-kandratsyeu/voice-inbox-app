import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
import { useProEntitlement } from '@/features/pro-license';

import type { Colors, ColorScheme } from './colors';
import { DEFAULT_ACCENT_COLOR_ID, getColors, privateModeColors } from './colors';

export function useAppTheme(): ColorScheme {
  const appTheme = useSettingsStore((s) => s.appTheme);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const systemScheme = useColorScheme();

  if (aiExecutionMode === 'private_experimental') {
    return 'dark';
  }

  if (appTheme === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return appTheme;
}

export function useColors(): Colors {
  const scheme = useAppTheme();
  const accentColorId = useSettingsStore((s) => s.accentColorId);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const { isProActive } = useProEntitlement();

  const resolvedAccent = isProActive ? accentColorId : DEFAULT_ACCENT_COLOR_ID;

  return useMemo(
    () =>
      aiExecutionMode === 'private_experimental'
        ? privateModeColors
        : getColors(scheme, resolvedAccent),
    [aiExecutionMode, scheme, resolvedAccent],
  );
}
