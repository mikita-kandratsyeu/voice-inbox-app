import {
  ANALYTICS_DEBUG,
  APP_ENV,
  CRASHLYTICS_DEBUG,
  DATABASE_URL,
  DB_LOG,
  MOBILE_USER_AGENT,
  TESTFLIGHT_INTERNAL_BUILD,
  WEB_API_SECRET,
} from '@env';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { getPlatformNativeName } from '../lib/platform';

const DEFAULT_MOBILE_UA_PREFIX = 'VoiceInbox-Mobile';

function trimBuildEnv(v: string | undefined): string {
  return (v ?? '').trim();
}

const SEMVER_TAIL_RE = /^\d+(\.\d+){0,3}$/;

function mobileUserAgentPrefixFromEnv(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return DEFAULT_MOBILE_UA_PREFIX;
  }

  const parts = t.split('/');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? '';

    if (SEMVER_TAIL_RE.test(last)) {
      const head = parts.slice(0, -1).join('/');

      return head.length > 0 ? head : DEFAULT_MOBILE_UA_PREFIX;
    }
  }

  return t;
}

function nativeAppVersionForUserAgent(): string {
  try {
    return String(DeviceInfoModule.version ?? '').trim();
  } catch {
    return '';
  }
}

function isTruthyBuildEnvFlag(v: string | undefined): boolean {
  const raw = trimBuildEnv(v).toLowerCase();

  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function getAppEnv(): string {
  return trimBuildEnv(APP_ENV);
}

export function getDatabaseUrl(): string {
  return trimBuildEnv(DATABASE_URL);
}

export function isDbLogEnabled(): boolean {
  return isTruthyBuildEnvFlag(DB_LOG);
}

export function isAnalyticsDebugEnabled(): boolean {
  return isTruthyBuildEnvFlag(ANALYTICS_DEBUG);
}

export function isCrashlyticsDebugEnabled(): boolean {
  return isTruthyBuildEnvFlag(CRASHLYTICS_DEBUG);
}

export function isTestflightInternalBuild(): boolean {
  return isTruthyBuildEnvFlag(TESTFLIGHT_INTERNAL_BUILD);
}

/** Dev or internal TestFlight — same gate as Settings → Debug entry. */
export function isInternalDebugBuild(): boolean {
  return __DEV__ || isTestflightInternalBuild();
}

export function getWebApiSecret(): string {
  return trimBuildEnv(WEB_API_SECRET);
}

export function getMobileUserAgent(): string {
  const prefix = mobileUserAgentPrefixFromEnv(trimBuildEnv(MOBILE_USER_AGENT));
  const ver = nativeAppVersionForUserAgent();
  const platform = getPlatformNativeName();

  return ver ? `${prefix}/${platform}:${ver}` : prefix;
}
