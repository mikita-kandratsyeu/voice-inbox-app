import {
  ANALYTICS_DEBUG,
  APP_ENV,
  CRASHLYTICS_DEBUG,
  DATABASE_URL,
  DB_LOG,
  MOBILE_USER_AGENT,
  SUBSCRIPTIONS_PUBLICLY_AVAILABLE,
  TESTFLIGHT_INTERNAL_BUILD,
  WEB_API_SECRET,
} from '@env';

function trimBuildEnv(v: string | undefined): string {
  return (v ?? '').trim();
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

export function isSubscriptionsPubliclyAvailable(): boolean {
  return isTruthyBuildEnvFlag(SUBSCRIPTIONS_PUBLICLY_AVAILABLE);
}

export function getWebApiSecret(): string {
  return trimBuildEnv(WEB_API_SECRET);
}

export function getMobileUserAgent(): string {
  return trimBuildEnv(MOBILE_USER_AGENT);
}
