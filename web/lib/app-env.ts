export const APP_ENV_VALUES = ['development', 'production', 'preview'] as const;

export type AppEnv = (typeof APP_ENV_VALUES)[number];

function normalizeRawAppEnv(value: string | undefined): AppEnv | null {
  const raw = (value ?? '').trim().toLowerCase();
  if (!raw) return null;

  if (raw === 'development') return 'development';
  if (raw === 'production') return 'production';
  if (raw === 'preview') return 'preview';

  return null;
}

/** Active runtime bucket (`APP_ENV`; defaults to `production` when unset). */
export function getAppEnv(): AppEnv {
  const fromEnv = normalizeRawAppEnv(process.env.APP_ENV);
  if (fromEnv) return fromEnv;

  return 'production';
}

/** Local dev only (`APP_ENV=development`). */
export function isDevelopmentAppEnv(): boolean {
  return getAppEnv() === 'development';
}

/**
 * Deployed behavior: `production` and `preview` share the same runtime gates
 * (secure cookies, no `/api/dev` previews, App Check enforced, etc.).
 */
export function isProductionLikeAppEnv(): boolean {
  const env = getAppEnv();
  return env === 'production' || env === 'preview';
}
