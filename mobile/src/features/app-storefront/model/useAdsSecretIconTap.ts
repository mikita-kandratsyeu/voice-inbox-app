import { useCallback, useEffect, useRef } from 'react';

import { isAdsSecretGestureEnabled } from '../lib/adsSecretGesture';

const TAP_TARGET = 7;
const TAP_WINDOW_MS = 2500;

type TapState = {
  count: number;
  resetTimer: ReturnType<typeof setTimeout> | null;
};

type Options = {
  onOpenProModal?: () => void;
};

export function useAdsSecretIconTap(options?: Options): { onSecretIconPress: () => void } {
  const onOpenProModal = options?.onOpenProModal;
  const tapRef = useRef<TapState>({ count: 0, resetTimer: null });
  const openRef = useRef(onOpenProModal);
  openRef.current = onOpenProModal;

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
      openRef.current?.();
      return;
    }

    r.resetTimer = setTimeout(() => {
      r.count = 0;
      r.resetTimer = null;
    }, TAP_WINDOW_MS);
  }, []);

  return { onSecretIconPress };
}
