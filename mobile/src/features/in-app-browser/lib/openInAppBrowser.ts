import { Linking } from 'react-native';
import { isAvailable, open } from 'react-native-inappbrowser-nitro';

import { useSettingsStore } from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { ColorScheme } from '@/shared/config';
import { DEFAULT_ACCENT_COLOR_ID, getColors } from '@/shared/config';

export async function openInAppBrowser(url: string, scheme: ColorScheme = 'light') {
  if (!(await isAvailable())) {
    await Linking.openURL(url);
    return;
  }

  const storedAccent = useSettingsStore.getState().accentColorId;
  const resolvedAccent = isProActiveFromStorageSync() ? storedAccent : DEFAULT_ACCENT_COLOR_ID;
  const color = getColors(scheme, resolvedAccent);
  await open(url, {
    preferredBarTintColor: { base: color.background.primary },
    preferredControlTintColor: { base: color.text.primary },
    toolbarColor: { base: color.accent.primary },
    colorScheme: scheme === 'dark' ? 'dark' : 'light',
  });
}
