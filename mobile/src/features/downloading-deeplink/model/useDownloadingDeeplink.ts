import { useCallback } from 'react';

import { diagWarn } from '@/shared/lib/appLogger';

import { navigationRef } from '@/app/navigation/navigationRef';

const DOWNLOAD_SETTINGS_DEEPLINKS: Record<string, 'WhisperModelPicker' | 'AIModelPicker'> = {
  'voiceinbox://settings/whisper': 'WhisperModelPicker',
  'voiceinbox://settings/ai-models': 'AIModelPicker',
};

export const useDownloadingDeeplink = () => {
  const handleDownloadingDeeplink = useCallback(async (url: URL) => {
    const href = url.toString().replace(/\/+$/, '');
    const settingsScreen = DOWNLOAD_SETTINGS_DEEPLINKS[href];
    if (!settingsScreen) {
      return;
    }

    try {
      if (!navigationRef.isReady()) {
        return;
      }
      navigationRef.navigate('Main', {
        screen: 'SettingsRoot',
        params: {
          state: {
            routes: [{ name: 'Settings' }, { name: settingsScreen }],
            index: 1,
          },
        },
      });
    } catch (e) {
      diagWarn('[useDownloadingDeeplink] failed to handle deeplink', e);
    }
  }, []);

  return {
    handleDownloadingDeeplink,
  };
};
