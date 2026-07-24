import { Linking } from 'react-native';
import { close, isAvailable, open } from 'react-native-inappbrowser-nitro';

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
  const uiStyle = scheme === 'dark' ? 'dark' : 'light';

  await open(url, {
    preferredBarTintColor: { base: color.background.primary },
    preferredControlTintColor: { base: color.text.primary },
    toolbarColor: { base: color.accent.primary },
    colorScheme: uiStyle,
    overrideUserInterfaceStyle: uiStyle,
  });
}

/** Dismisses the in-app browser if it is open (no-op when unavailable). */
export async function closeInAppBrowser(): Promise<void> {
  if (!(await isAvailable())) {
    return;
  }
  try {
    await close();
  } catch {
    // Browser may already be closed by the user.
  }
}
