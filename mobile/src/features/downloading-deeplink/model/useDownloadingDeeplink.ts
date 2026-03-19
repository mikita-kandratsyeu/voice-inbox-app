import { useCallback } from 'react';

import { navigationRef } from '@/app/navigation/navigationRef';

export const useDownloadingDeeplink = () => {
  const handleDownloadingDeeplink = useCallback(async (url: URL) => {
    const href = url.toString().replace(/\/+$/, '');
    if (href !== 'voiceinbox://settings/whisper') {
      return;
    }

    try {
      if (!navigationRef.isReady()) {
        return;
      }
      navigationRef.navigate('Main', {
        screen: 'SettingsRoot',
        params: { screen: 'WhisperModelPicker' },
      });
    } catch (e) {
      if (__DEV__) {
        console.warn('[useDownloadingDeeplink] failed to handle deeplink', e);
      }
    }
  }, []);

  return {
    handleDownloadingDeeplink,
  };
};
