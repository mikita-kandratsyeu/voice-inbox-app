import { getYandexBannerAdUnitId } from '@/shared/config/runtimeConfig';
import { isString } from '@/shared/lib';

export const DEMO_BANNER_AD_UNIT_ID = 'demo-banner-yandex';

export function getBannerAdUnitId(): string {
  const raw = getYandexBannerAdUnitId() ?? '';

  return isString(raw) && raw.trim() ? raw.trim() : DEMO_BANNER_AD_UNIT_ID;
}
