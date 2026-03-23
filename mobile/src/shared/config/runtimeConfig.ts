import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  MOBILE_USER_AGENT,
  WEB_API_SECRET,
  WEB_API_URL,
  WEBSITE_URL,
  YANDEX_BANNER_AD_UNIT_ID,
  YANDEX_REWARDED_AD_UNIT_ID,
} from '@env';
import remoteConfig from '@react-native-firebase/remote-config';

type RemoteKey =
  | 'WEBSITE_URL'
  | 'APP_STORE_URL'
  | 'GOOGLE_PLAY_URL'
  | 'WEB_API_URL'
  | 'YANDEX_REWARDED_AD_UNIT_ID'
  | 'YANDEX_BANNER_AD_UNIT_ID';

export type RuntimeConfigSnapshot = {
  websiteUrl: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  webApiUrl: string;
  webApiSecret: string;
  mobileUserAgent: string;
  yandexRewardedAdUnitId: string;
  yandexBannerAdUnitId: string;
};

function buildEmbedded(): RuntimeConfigSnapshot {
  return {
    websiteUrl: WEBSITE_URL?.trim() ?? '',
    appStoreUrl: APP_STORE_URL?.trim() ?? '',
    googlePlayUrl: GOOGLE_PLAY_URL?.trim() ?? '',
    webApiUrl: WEB_API_URL?.trim() ?? '',
    webApiSecret: WEB_API_SECRET?.trim() ?? '',
    mobileUserAgent: MOBILE_USER_AGENT?.trim() ?? '',
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

function readRemoteString(
  rc: ReturnType<typeof remoteConfig>,
  key: RemoteKey,
  fallback: string,
): string {
  const v = rc.getValue(key).asString().trim();
  return v.length > 0 ? v : fallback;
}

function mergeRemote(
  rc: ReturnType<typeof remoteConfig>,
  embedded: RuntimeConfigSnapshot,
): RuntimeConfigSnapshot {
  return {
    websiteUrl: readRemoteString(rc, 'WEBSITE_URL', embedded.websiteUrl),
    appStoreUrl: readRemoteString(rc, 'APP_STORE_URL', embedded.appStoreUrl),
    googlePlayUrl: readRemoteString(rc, 'GOOGLE_PLAY_URL', embedded.googlePlayUrl),
    webApiUrl: readRemoteString(rc, 'WEB_API_URL', embedded.webApiUrl),
    webApiSecret: embedded.webApiSecret,
    mobileUserAgent: embedded.mobileUserAgent,
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
    const rc = remoteConfig();
    await rc.setDefaults(toFirebaseDefaults(embedded));
    await rc.setConfigSettings({
      minimumFetchIntervalMillis: 60 * 60 * 1000,
    });
    await rc.fetchAndActivate();
    snapshot = mergeRemote(rc, embedded);
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

export function getWebApiSecret(): string {
  return snapshot.webApiSecret;
}

export function getMobileUserAgent(): string {
  return snapshot.mobileUserAgent;
}

export function getYandexRewardedAdUnitId(): string {
  return snapshot.yandexRewardedAdUnitId;
}

export function getYandexBannerAdUnitId(): string {
  return snapshot.yandexBannerAdUnitId;
}
