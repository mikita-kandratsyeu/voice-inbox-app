import { useEffect } from 'react';
import { MobileAds } from 'yandex-mobile-ads';

export function useYandexMobileAdsInit(): void {
  useEffect(() => {
    void MobileAds.initialize();
  }, []);
}
