import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  PRO_LICENSE_KEY_ACTIVATION_ENABLED,
  REVENUECAT_AI_RESET_PRODUCT_ID,
  REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_PACKAGE_TYPE_PREFERRED,
  SUBSCRIPTIONS_PUBLICLY_AVAILABLE,
  WEB_API_URL,
  WEBSITE_URL,
  YANDEX_BANNER_AD_UNIT_ID,
  YANDEX_INTERSTITIAL_AD_UNIT_ID,
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

import { readTestflightWebApiUrlOverride } from './testflightWebApiOverride';

type RemoteKey =
  | 'WEBSITE_URL'
  | 'APP_STORE_URL'
  | 'GOOGLE_PLAY_URL'
  | 'WEB_API_URL'
  | 'YANDEX_REWARDED_AD_UNIT_ID'
  | 'YANDEX_BANNER_AD_UNIT_ID'
  | 'YANDEX_INTERSTITIAL_AD_UNIT_ID'
  | 'REVENUECAT_API_KEY_IOS'
  | 'REVENUECAT_API_KEY_ANDROID'
  | 'REVENUECAT_ENTITLEMENT_ID'
  | 'REVENUECAT_PACKAGE_TYPE_PREFERRED'
  | 'REVENUECAT_AI_RESET_PRODUCT_ID'
  | 'SUBSCRIPTIONS_PUBLICLY_AVAILABLE'
  | 'PRO_LICENSE_KEY_ACTIVATION_ENABLED';

type RemoteConfigModule = ReturnType<typeof getRemoteConfig>;

export type RuntimeConfigSnapshot = {
  websiteUrl: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  webApiUrl: string;
  yandexRewardedAdUnitId: string;
  yandexBannerAdUnitId: string;
  yandexInterstitialAdUnitId: string;
  revenueCatApiKeyIos: string;
  revenueCatApiKeyAndroid: string;
  revenueCatEntitlementId: string;
  revenueCatPackageTypePreferred: string;
  revenueCatAiResetProductId: string;
  subscriptionsPubliclyAvailable: boolean;
  proLicenseKeyActivationEnabled: boolean;
};

function isTruthyEnvFlag(v: string | undefined): boolean {
  const raw = (v ?? '').trim().toLowerCase();

  return raw === '1' || raw === 'true' || raw === 'yes';
}

function buildEmbedded(): RuntimeConfigSnapshot {
  return {
    websiteUrl: WEBSITE_URL?.trim() ?? '',
    appStoreUrl: APP_STORE_URL?.trim() ?? '',
    googlePlayUrl: GOOGLE_PLAY_URL?.trim() ?? '',
    webApiUrl: WEB_API_URL?.trim() ?? '',
    yandexRewardedAdUnitId: YANDEX_REWARDED_AD_UNIT_ID?.trim() ?? '',
    yandexBannerAdUnitId: YANDEX_BANNER_AD_UNIT_ID?.trim() ?? '',
    yandexInterstitialAdUnitId: YANDEX_INTERSTITIAL_AD_UNIT_ID?.trim() ?? '',
    revenueCatApiKeyIos: REVENUECAT_API_KEY_IOS?.trim() ?? '',
    revenueCatApiKeyAndroid: REVENUECAT_API_KEY_ANDROID?.trim() ?? '',
    revenueCatEntitlementId: REVENUECAT_ENTITLEMENT_ID?.trim() ?? '',
    revenueCatPackageTypePreferred: REVENUECAT_PACKAGE_TYPE_PREFERRED?.trim() ?? '',
    revenueCatAiResetProductId: REVENUECAT_AI_RESET_PRODUCT_ID?.trim() ?? '',
    subscriptionsPubliclyAvailable: isTruthyEnvFlag(SUBSCRIPTIONS_PUBLICLY_AVAILABLE),
    proLicenseKeyActivationEnabled: isTruthyEnvFlag(PRO_LICENSE_KEY_ACTIVATION_ENABLED),
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
    YANDEX_INTERSTITIAL_AD_UNIT_ID: s.yandexInterstitialAdUnitId,
    REVENUECAT_API_KEY_IOS: s.revenueCatApiKeyIos,
    REVENUECAT_API_KEY_ANDROID: s.revenueCatApiKeyAndroid,
    REVENUECAT_ENTITLEMENT_ID: s.revenueCatEntitlementId,
    REVENUECAT_PACKAGE_TYPE_PREFERRED: s.revenueCatPackageTypePreferred,
    REVENUECAT_AI_RESET_PRODUCT_ID: s.revenueCatAiResetProductId,
    SUBSCRIPTIONS_PUBLICLY_AVAILABLE: s.subscriptionsPubliclyAvailable ? '1' : '0',
    PRO_LICENSE_KEY_ACTIVATION_ENABLED: s.proLicenseKeyActivationEnabled ? '1' : '0',
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

function readRemoteBool(rc: RemoteConfigModule, key: RemoteKey, fallback: boolean): boolean {
  const raw = getValue(rc, key).asString().trim().toLowerCase();

  if (raw.length === 0) {
    return fallback;
  }

  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return true;
  }

  if (raw === '0' || raw === 'false' || raw === 'no') {
    return false;
  }

  return fallback;
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
    yandexInterstitialAdUnitId: readRemoteString(
      rc,
      'YANDEX_INTERSTITIAL_AD_UNIT_ID',
      embedded.yandexInterstitialAdUnitId,
    ),
    revenueCatApiKeyIos: readRemoteString(
      rc,
      'REVENUECAT_API_KEY_IOS',
      embedded.revenueCatApiKeyIos,
    ),
    revenueCatApiKeyAndroid: readRemoteString(
      rc,
      'REVENUECAT_API_KEY_ANDROID',
      embedded.revenueCatApiKeyAndroid,
    ),
    revenueCatEntitlementId: readRemoteString(
      rc,
      'REVENUECAT_ENTITLEMENT_ID',
      embedded.revenueCatEntitlementId,
    ),
    revenueCatPackageTypePreferred: readRemoteString(
      rc,
      'REVENUECAT_PACKAGE_TYPE_PREFERRED',
      embedded.revenueCatPackageTypePreferred,
    ),
    revenueCatAiResetProductId: readRemoteString(
      rc,
      'REVENUECAT_AI_RESET_PRODUCT_ID',
      embedded.revenueCatAiResetProductId,
    ),
    subscriptionsPubliclyAvailable: readRemoteBool(
      rc,
      'SUBSCRIPTIONS_PUBLICLY_AVAILABLE',
      embedded.subscriptionsPubliclyAvailable,
    ),
    proLicenseKeyActivationEnabled: readRemoteBool(
      rc,
      'PRO_LICENSE_KEY_ACTIVATION_ENABLED',
      embedded.proLicenseKeyActivationEnabled,
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
  const override = readTestflightWebApiUrlOverride();

  if (override) {
    return override;
  }

  return snapshot.webApiUrl;
}

export function getYandexRewardedAdUnitId(): string {
  return snapshot.yandexRewardedAdUnitId;
}

export function getYandexBannerAdUnitId(): string {
  return snapshot.yandexBannerAdUnitId;
}

export function getYandexInterstitialAdUnitId(): string {
  return snapshot.yandexInterstitialAdUnitId;
}

export function getRevenueCatApiKeyIos(): string {
  return snapshot.revenueCatApiKeyIos;
}

export function getRevenueCatApiKeyAndroid(): string {
  return snapshot.revenueCatApiKeyAndroid;
}

export function getRevenueCatEntitlementId(): string {
  return snapshot.revenueCatEntitlementId;
}

export function getRevenueCatPackageTypePreferred(): string {
  return snapshot.revenueCatPackageTypePreferred;
}

export function getRevenueCatAiResetProductId(): string {
  return snapshot.revenueCatAiResetProductId;
}

export function getSubscriptionsPubliclyAvailable(): boolean {
  return snapshot.subscriptionsPubliclyAvailable;
}

export function getProLicenseKeyActivationEnabled(): boolean {
  return snapshot.proLicenseKeyActivationEnabled;
}
