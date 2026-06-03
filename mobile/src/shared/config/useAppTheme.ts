import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
import { useProActiveFromStorage } from '@/features/pro-license';

import { useBootSplashVisible } from './bootSplashThemeContext';
import type { Colors, ColorScheme } from './colors';
import {
  customServerModeColors,
  DEFAULT_ACCENT_COLOR_ID,
  getColors,
  privateModeColors,
} from './colors';

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
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProActiveFromStorage();
  const bootSplashVisible = useBootSplashVisible();

  const resolvedAccent = bootSplashVisible || isProActive ? accentColorId : DEFAULT_ACCENT_COLOR_ID;

  return useMemo(() => {
    if (aiExecutionMode !== 'private_experimental') {
      return getColors(scheme, resolvedAccent);
    }
    return privateAiProvider === 'custom_openai' ? customServerModeColors : privateModeColors;
  }, [aiExecutionMode, privateAiProvider, scheme, resolvedAccent]);
}
