import dayjs from 'dayjs';
import { AdRequestConfiguration, InterstitialAdLoader } from 'yandex-mobile-ads';

import { getYandexInterstitialAdUnitId } from '@/shared/config/runtimeConfig';
import { storage } from '@/shared/lib/async-storage';
import { isString } from '@/shared/lib/type-guards';

import {
  INTERSTITIAL_AUTO_ORGANIZE_MAX_PER_DAY,
  INTERSTITIAL_GLOBAL_COOLDOWN_MS,
  STORAGE_KEY_AUTO_ORGANIZE_COUNT,
  STORAGE_KEY_AUTO_ORGANIZE_DAY,
  STORAGE_KEY_INTERSTITIAL_LAST_SHOWN_MS,
} from '../model/constants';

const DEMO_INTERSTITIAL_UNIT_ID = 'demo-interstitial-yandex';

export type YandexInterstitialTrigger =
  | 'after_note_create'
  | 'after_import'
  | 'after_auto_organize';

let interstitialLoadInFlight = false;

function getAdUnitId(): string {
  const raw = getYandexInterstitialAdUnitId();
  return isString(raw) && raw.trim() ? raw.trim() : DEMO_INTERSTITIAL_UNIT_ID;
}

function readLastShownMs(): number {
  try {
    const n = storage.getNumber(STORAGE_KEY_INTERSTITIAL_LAST_SHOWN_MS);
    return n != null && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeLastShownMs(ms: number): void {
  try {
    storage.set(STORAGE_KEY_INTERSTITIAL_LAST_SHOWN_MS, ms);
  } catch {
    /* ignore */
  }
}

function isGlobalCooldownActive(): boolean {
  const last = readLastShownMs();
  if (last <= 0) return false;
  return Date.now() - last < INTERSTITIAL_GLOBAL_COOLDOWN_MS;
}

function readAutoOrganizeCountForToday(): number {
  const today = dayjs().format('YYYY-MM-DD');
  try {
    const storedDay = storage.getString(STORAGE_KEY_AUTO_ORGANIZE_DAY) ?? '';
    if (storedDay !== today) {
      return 0;
    }
    const n = storage.getNumber(STORAGE_KEY_AUTO_ORGANIZE_COUNT);
    return n != null && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function incrementAutoOrganizeCount(): void {
  const today = dayjs().format('YYYY-MM-DD');
  try {
    const storedDay = storage.getString(STORAGE_KEY_AUTO_ORGANIZE_DAY) ?? '';
    const prev =
      storedDay === today ? (storage.getNumber(STORAGE_KEY_AUTO_ORGANIZE_COUNT) ?? 0) : 0;
    storage.set(STORAGE_KEY_AUTO_ORGANIZE_DAY, today);
    storage.set(STORAGE_KEY_AUTO_ORGANIZE_COUNT, prev + 1);
  } catch {
    /* ignore */
  }
}

function shouldAttemptForTrigger(trigger: YandexInterstitialTrigger): boolean {
  if (isGlobalCooldownActive()) {
    return false;
  }
  if (trigger === 'after_auto_organize') {
    return readAutoOrganizeCountForToday() < INTERSTITIAL_AUTO_ORGANIZE_MAX_PER_DAY;
  }
  return true;
}

export async function tryShowYandexInterstitial(params: {
  adsAllowed: boolean;
  trigger: YandexInterstitialTrigger;
}): Promise<void> {
  if (!params.adsAllowed) {
    return;
  }

  if (!shouldAttemptForTrigger(params.trigger)) {
    return;
  }

  if (interstitialLoadInFlight) {
    return;
  }

  interstitialLoadInFlight = true;

  try {
    const loader = await InterstitialAdLoader.create();
    const ad = await loader.loadAd(
      new AdRequestConfiguration({
        adUnitId: getAdUnitId(),
      }),
    );

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };

      ad.onAdShown = () => {
        writeLastShownMs(Date.now());
        if (params.trigger === 'after_auto_organize') {
          incrementAutoOrganizeCount();
        }
      };

      ad.onAdFailedToShow = () => {
        done();
      };

      ad.onAdDismissed = () => {
        done();
      };

      void ad.show().catch(() => {
        done();
      });
    });
  } catch {
    if (__DEV__) {
      console.warn('[yandexInterstitial]', 'showAd', {
        adUnitId: getAdUnitId(),
        note: 'failed to show ad',
      });
    }
  } finally {
    interstitialLoadInFlight = false;
  }
}
