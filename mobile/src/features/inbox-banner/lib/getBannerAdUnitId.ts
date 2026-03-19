import { YANDEX_BANNER_AD_UNIT_ID } from '@env';

/** Демо-блок из справки Yandex; в проде заменить на ID из кабинета. */
export const DEMO_BANNER_AD_UNIT_ID = 'demo-banner-yandex';

export function getBannerAdUnitId(): string {
  const raw = YANDEX_BANNER_AD_UNIT_ID ?? '';
  return typeof raw === 'string' && raw.trim() ? raw.trim() : DEMO_BANNER_AD_UNIT_ID;
}
