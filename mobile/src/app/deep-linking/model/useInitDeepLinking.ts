import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';

import { useDownloadingDeeplink } from '@/features/downloading-deeplink';
import { useRecordingDeeplink } from '@/features/recording-deeplink/model/useRecordingDeeplink';

export const useInitDeepLinking = () => {
  const { handleRecordingDeeplink } = useRecordingDeeplink();
  const { handleDownloadingDeeplink } = useDownloadingDeeplink();

  const routeDeepLink = useCallback(
    (rawUrl: string) => {
      try {
        const url = new URL(rawUrl);

        handleRecordingDeeplink(url);
        handleDownloadingDeeplink(url);
      } catch (e) {
        if (__DEV__) console.warn('[deeplink] invalid url', rawUrl, e);
      }
    },
    [handleDownloadingDeeplink, handleRecordingDeeplink],
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
