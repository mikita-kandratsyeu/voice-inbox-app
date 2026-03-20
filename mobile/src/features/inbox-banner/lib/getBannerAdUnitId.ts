import { YANDEX_BANNER_AD_UNIT_ID } from '@env';

import { isString } from '@/shared/lib';

export const DEMO_BANNER_AD_UNIT_ID = 'demo-banner-yandex';

export function getBannerAdUnitId(): string {
  const raw = YANDEX_BANNER_AD_UNIT_ID ?? '';
  return isString(raw) && raw.trim() ? raw.trim() : DEMO_BANNER_AD_UNIT_ID;
}
