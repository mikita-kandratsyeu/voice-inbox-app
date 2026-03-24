import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  WEB_API_URL,
  WEBSITE_URL,
  YANDEX_BANNER_AD_UNIT_ID,
  YANDEX_REWARDED_AD_UNIT_ID,
} from '@env';
import { getApp } from '@react-native-firebase/app';
import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  setConfigSettings,
  setDefaults,
} from '@react-native-firebase/remote-config';

type RemoteKey =
  | 'WEBSITE_URL'
  | 'APP_STORE_URL'
  | 'GOOGLE_PLAY_URL'
  | 'WEB_API_URL'
  | 'YANDEX_REWARDED_AD_UNIT_ID'
  | 'YANDEX_BANNER_AD_UNIT_ID';

type RemoteConfigModule = ReturnType<typeof getRemoteConfig>;

export type RuntimeConfigSnapshot = {
  websiteUrl: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  webApiUrl: string;
  yandexRewardedAdUnitId: string;
  yandexBannerAdUnitId: string;
};

function buildEmbedded(): RuntimeConfigSnapshot {
  return {
    websiteUrl: WEBSITE_URL?.trim() ?? '',
    appStoreUrl: APP_STORE_URL?.trim() ?? '',
    googlePlayUrl: GOOGLE_PLAY_URL?.trim() ?? '',
    webApiUrl: WEB_API_URL?.trim() ?? '',
    yandexRewardedAdUnitId: YANDEX_REWARDED_AD_UNIT_ID?.trim() ?? '',
    yandexBannerAdUnitId: YANDEX_BANNER_AD_UNIT_ID?.trim() ?? '',
  };
}

function toFirebaseDefaults(s: RuntimeConfigSnapshot): Record<string, string> {
  return {
    WEBSITE_URL: s.websiteUrl,
    APP_STORE_URL: s.appStoreUrl,
    GOOGLE_PLAY_URL: s.googlePlayUrl,
    WEB_API_URL: s.webApiUrl,
    YANDEX_REWARDED_AD_UNIT_ID: s.yandexRewardedAdUnitId,
    YANDEX_BANNER_AD_UNIT_ID: s.yandexBannerAdUnitId,
  };
}

function isValidAbsoluteHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());

    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function readRemoteWebApiUrl(rc: RemoteConfigModule, embeddedFallback: string): string {
  const raw = getValue(rc, 'WEB_API_URL').asString().trim();

  if (raw.length === 0) {
    return embeddedFallback;
  }

  if (!isValidAbsoluteHttpUrl(raw)) {
    return embeddedFallback;
  }

  return raw;
}

function readRemoteString(rc: RemoteConfigModule, key: RemoteKey, fallback: string): string {
  const v = getValue(rc, key).asString().trim();

  return v.length > 0 ? v : fallback;
}

const REMOTE_CONFIG_FETCH_TIMEOUT_MS = 15_000;

async function fetchAndActivateWithTimeout(rc: RemoteConfigModule): Promise<void> {
  await Promise.race([
    fetchAndActivate(rc),
    new Promise<void>((_, reject) => {
      setTimeout(
        () => reject(new Error('remote_config_fetch_timeout')),
        REMOTE_CONFIG_FETCH_TIMEOUT_MS,
      );
    }),
  ]);
}

function mergeRemote(
  rc: RemoteConfigModule,
  embedded: RuntimeConfigSnapshot,
): RuntimeConfigSnapshot {
  return {
    websiteUrl: readRemoteString(rc, 'WEBSITE_URL', embedded.websiteUrl),
    appStoreUrl: readRemoteString(rc, 'APP_STORE_URL', embedded.appStoreUrl),
    googlePlayUrl: readRemoteString(rc, 'GOOGLE_PLAY_URL', embedded.googlePlayUrl),
    webApiUrl: readRemoteWebApiUrl(rc, embedded.webApiUrl),
    yandexRewardedAdUnitId: readRemoteString(
      rc,
      'YANDEX_REWARDED_AD_UNIT_ID',
      embedded.yandexRewardedAdUnitId,
    ),
    yandexBannerAdUnitId: readRemoteString(
      rc,
      'YANDEX_BANNER_AD_UNIT_ID',
      embedded.yandexBannerAdUnitId,
    ),
  };
}

let snapshot: RuntimeConfigSnapshot = buildEmbedded();

export async function initRuntimeConfig(): Promise<void> {
  const embedded = buildEmbedded();
  snapshot = embedded;

  if (__DEV__) {
    return;
  }

  try {
    const rc = getRemoteConfig(getApp());
    await setDefaults(rc, toFirebaseDefaults(embedded));
    await setConfigSettings(rc, {
      minimumFetchIntervalMillis: 60 * 60 * 1000,
    });
    await fetchAndActivateWithTimeout(rc);
    const merged = mergeRemote(rc, embedded);
    snapshot =
      merged.webApiUrl.trim().length === 0 && embedded.webApiUrl.trim().length > 0
        ? { ...merged, webApiUrl: embedded.webApiUrl }
        : merged;
  } catch {
    snapshot = embedded;
  }
}

export function getWebsiteUrl(): string {
  return snapshot.websiteUrl;
}

export function getAppStoreUrl(): string {
  return snapshot.appStoreUrl;
}

export function getGooglePlayUrl(): string {
  return snapshot.googlePlayUrl;
}

export function getWebApiUrl(): string {
  return snapshot.webApiUrl;
}

export function getYandexRewardedAdUnitId(): string {
  return snapshot.yandexRewardedAdUnitId;
}

export function getYandexBannerAdUnitId(): string {
  return snapshot.yandexBannerAdUnitId;
}
