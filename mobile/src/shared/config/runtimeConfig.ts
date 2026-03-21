import * as Env from '@env';
import remoteConfig from '@react-native-firebase/remote-config';

type RemoteKey =
  | 'WEBSITE_URL'
  | 'APP_STORE_URL'
  | 'GOOGLE_PLAY_URL'
  | 'WEB_API_URL'
  | 'WEB_API_SECRET'
  | 'MOBILE_USER_AGENT'
  | 'YANDEX_REWARDED_AD_UNIT_ID'
  | 'YANDEX_BANNER_AD_UNIT_ID'
  | 'ADS_SECRET_GESTURE';

export type RuntimeConfigSnapshot = {
  websiteUrl: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  webApiUrl: string;
  webApiSecret: string;
  mobileUserAgent: string;
  yandexRewardedAdUnitId: string;
  yandexBannerAdUnitId: string;
  adsSecretGesture: string;
};

function buildEmbedded(): RuntimeConfigSnapshot {
  return {
    websiteUrl: Env.WEBSITE_URL?.trim() ?? '',
    appStoreUrl: Env.APP_STORE_URL?.trim() ?? '',
    googlePlayUrl: Env.GOOGLE_PLAY_URL?.trim() ?? '',
    webApiUrl: Env.WEB_API_URL?.trim() ?? '',
    webApiSecret: Env.WEB_API_SECRET?.trim() ?? '',
    mobileUserAgent: Env.MOBILE_USER_AGENT?.trim() ?? '',
    yandexRewardedAdUnitId: Env.YANDEX_REWARDED_AD_UNIT_ID?.trim() ?? '',
    yandexBannerAdUnitId: Env.YANDEX_BANNER_AD_UNIT_ID?.trim() ?? '',
    adsSecretGesture: Env.ADS_SECRET_GESTURE?.trim() ?? '',
  };
}

function toFirebaseDefaults(s: RuntimeConfigSnapshot): Record<string, string> {
  return {
    WEBSITE_URL: s.websiteUrl,
    APP_STORE_URL: s.appStoreUrl,
    GOOGLE_PLAY_URL: s.googlePlayUrl,
    WEB_API_URL: s.webApiUrl,
    WEB_API_SECRET: s.webApiSecret,
    MOBILE_USER_AGENT: s.mobileUserAgent,
    YANDEX_REWARDED_AD_UNIT_ID: s.yandexRewardedAdUnitId,
    YANDEX_BANNER_AD_UNIT_ID: s.yandexBannerAdUnitId,
    ADS_SECRET_GESTURE: s.adsSecretGesture,
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
    webApiSecret: readRemoteString(rc, 'WEB_API_SECRET', embedded.webApiSecret),
    mobileUserAgent: readRemoteString(rc, 'MOBILE_USER_AGENT', embedded.mobileUserAgent),
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
    adsSecretGesture: readRemoteString(rc, 'ADS_SECRET_GESTURE', embedded.adsSecretGesture),
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

export function getAdsSecretGestureRaw(): string {
  return snapshot.adsSecretGesture;
}
