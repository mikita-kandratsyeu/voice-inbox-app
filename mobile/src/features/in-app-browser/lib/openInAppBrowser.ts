import { Linking } from 'react-native';
import { InAppBrowser } from 'react-native-inappbrowser-nitro';

import { useSettingsStore } from '@/entities/settings';
import type { ColorScheme } from '@/shared/config';
import { getColors } from '@/shared/config';

export async function openInAppBrowser(url: string, scheme: ColorScheme = 'light') {
  if (!(await InAppBrowser.isAvailable())) {
    await Linking.openURL(url);
    return;
  }

  const accentColorId = useSettingsStore.getState().accentColorId;
  const color = getColors(scheme, accentColorId);
  await InAppBrowser.open(url, {
    preferredBarTintColor: { base: color.background.primary },
    preferredControlTintColor: { base: color.text.primary },
    toolbarColor: { base: color.accent.primary },
    colorScheme: scheme === 'dark' ? 'dark' : 'light',
  });
}
