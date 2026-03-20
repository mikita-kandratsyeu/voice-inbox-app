import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { isAdsSecretGestureEnabled, toggleAdsForceDisabled } from '../lib/adsSecretGesture';

const TAP_TARGET = 7;
const TAP_WINDOW_MS = 2500;

type TapState = {
  count: number;
  resetTimer: ReturnType<typeof setTimeout> | null;
};

export function useAdsSecretIconTap(): { onSecretIconPress: () => void } {
  const tapRef = useRef<TapState>({ count: 0, resetTimer: null });

  useEffect(() => {
    const tapState = tapRef.current;
    return () => {
      const t = tapState.resetTimer;
      if (t) {
        clearTimeout(t);
      }
    };
  }, []);

  const onSecretIconPress = useCallback(() => {
    if (!isAdsSecretGestureEnabled()) {
      return;
    }

    const r = tapRef.current;
    if (r.resetTimer) {
      clearTimeout(r.resetTimer);
    }

    r.count += 1;
    if (r.count >= TAP_TARGET) {
      r.count = 0;
      r.resetTimer = null;
      const adsHidden = toggleAdsForceDisabled();
      Alert.alert(
        adsHidden ? 'Ads off' : 'Ads on',
        adsHidden
          ? 'Local ad hiding enabled (banners + bonus ad).'
          : 'Ads follow normal rules again.',
      );

      return;
    }

    r.resetTimer = setTimeout(() => {
      r.count = 0;
      r.resetTimer = null;
    }, TAP_WINDOW_MS);
  }, []);

  return { onSecretIconPress };
}
