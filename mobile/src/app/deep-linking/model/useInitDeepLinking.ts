import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';

import { navigationRef } from '@/app/navigation/navigationRef';
import { useDownloadingDeeplink } from '@/features/downloading-deeplink';
import { useRecordingDeeplink } from '@/features/recording-deeplink/model/useRecordingDeeplink';

const START_RECORDING_URL = 'voiceinbox://record/start';

const pendingRecordModalOpenRef = { current: false };

export const flushPendingRecordModalNavigation = () => {
  if (!pendingRecordModalOpenRef.current || !navigationRef.isReady()) {
    return;
  }

  pendingRecordModalOpenRef.current = false;
  navigationRef.navigate('RecordModal');
};

export const useInitDeepLinking = () => {
  const { handleRecordingDeeplink } = useRecordingDeeplink();
  const { handleDownloadingDeeplink } = useDownloadingDeeplink();

  const handleStartRecording = useCallback((rawUrl: string) => {
    const normalized = rawUrl.replace(/\/+$/, '');
    if (normalized !== START_RECORDING_URL) return false;

    if (navigationRef.isReady()) {
      navigationRef.navigate('RecordModal');
    } else {
      pendingRecordModalOpenRef.current = true;
    }
    return true;
  }, []);

  const routeDeepLink = useCallback(
    (rawUrl: string) => {
      try {
        if (handleStartRecording(rawUrl)) return;

        const url = new URL(rawUrl);

        handleRecordingDeeplink(url);
        handleDownloadingDeeplink(url);
      } catch (e) {
        if (__DEV__) console.warn('[deeplink] invalid url', rawUrl, e);
      }
    },
    [handleDownloadingDeeplink, handleRecordingDeeplink, handleStartRecording],
  );

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        routeDeepLink(url);
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      routeDeepLink(url);
    });

    return () => sub.remove();
  }, [routeDeepLink]);
};
