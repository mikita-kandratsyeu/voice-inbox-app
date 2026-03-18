import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';

import { useRecordingDeeplink } from '@/features/recording-deeplink/model/useRecordingDeeplink';

export const useInitDeepLinking = () => {
  const { handleRecordingDeeplink } = useRecordingDeeplink();

  const routeDeepLink = useCallback(
    (rawUrl: string) => {
      try {
        const url = new URL(rawUrl);

        handleRecordingDeeplink(url);
      } catch (e) {
        if (__DEV__) console.warn('[deeplink] invalid url', rawUrl, e);
      }
    },
    [handleRecordingDeeplink],
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
