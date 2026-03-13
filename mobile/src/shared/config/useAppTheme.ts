import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/entities/settings';

import type { ColorScheme } from './colors';

export function useAppTheme(): ColorScheme {
  const appTheme = useSettingsStore((s) => s.appTheme);
  const systemScheme = useColorScheme();

  if (appTheme === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return appTheme;
}
