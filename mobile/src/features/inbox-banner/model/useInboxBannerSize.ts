import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { BannerAdSize } from 'yandex-mobile-ads';

/**
 * Адаптивный sticky-баннер по ширине контента списка (как у inbox max width).
 */
export function useInboxBannerSize(contentMaxWidth: number): BannerAdSize | null {
  const { width: windowWidth } = useWindowDimensions();
  const [size, setSize] = useState<BannerAdSize | null>(null);

  useEffect(() => {
    let cancelled = false;
    const w = Math.floor(Math.min(windowWidth, contentMaxWidth));
    if (w < 320) {
      setSize(null);
      return () => {
        cancelled = true;
      };
    }

    void BannerAdSize.stickySize(w)
      .then((s) => {
        if (!cancelled) setSize(s);
      })
      .catch(() => {
        if (!cancelled) setSize(null);
      });

    return () => {
      cancelled = true;
    };
  }, [windowWidth, contentMaxWidth]);

  return size;
}
