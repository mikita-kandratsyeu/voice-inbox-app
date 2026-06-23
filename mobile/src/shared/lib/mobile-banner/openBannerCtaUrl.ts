import { Linking } from 'react-native';

import { runNavigationWhenUnlocked } from '@/app/navigation/deferredNavigation';
import { navigationRef } from '@/app/navigation/navigationRef';
import { openInAppBrowser } from '@/features/in-app-browser';
import { tryParseInAppEventDeepLink } from '@/features/in-app-event';
import { openPlanPaywall } from '@/features/plan-paywall';
import { diagWarn } from '@/shared/lib/appLogger';

const DOWNLOAD_SETTINGS_DEEPLINKS: Record<string, 'WhisperModelPicker' | 'AIModelPicker'> = {
  'voiceinbox://settings/whisper': 'WhisperModelPicker',
  'voiceinbox://settings/ai-models': 'AIModelPicker',
};

function normalizeDeepLink(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function openSettingsScreen(screen: 'WhisperModelPicker' | 'AIModelPicker'): void {
  runNavigationWhenUnlocked(() => {
    navigationRef.navigate('Main', {
      screen: 'SettingsRoot',
      params: {
        state: {
          routes: [{ name: 'Settings' }, { name: screen }],
          index: 1,
        },
      },
    });
  });
}

export async function openMobileBannerCtaUrl(rawUrl: string): Promise<void> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return;
  }

  try {
    if (trimmed.toLowerCase().startsWith('https:')) {
      await openInAppBrowser(trimmed);
      return;
    }

    if (trimmed.toLowerCase().startsWith('mailto:')) {
      await Linking.openURL(trimmed);
      return;
    }

    const normalized = normalizeDeepLink(trimmed);

    if (normalized === 'voiceinbox://settings/pro') {
      openPlanPaywall();
      return;
    }

    const settingsScreen = DOWNLOAD_SETTINGS_DEEPLINKS[normalized];
    if (settingsScreen) {
      openSettingsScreen(settingsScreen);
      return;
    }

    const eventId = tryParseInAppEventDeepLink(normalized);
    if (eventId) {
      runNavigationWhenUnlocked(() => {
        navigationRef.navigate('InAppEventDetail', { eventId });
      });
      return;
    }

    await Linking.openURL(trimmed);
  } catch (e) {
    diagWarn('[mobile-banner] failed to open CTA url', { url: trimmed }, e);
  }
}
