export type WebApiTarget = 'production' | 'preview';

export const DEFAULT_WEB_API_TARGET: WebApiTarget = 'production';

export function parseWebApiTarget(raw: string | undefined): WebApiTarget {
  const normalized = (raw ?? '').trim().toLowerCase();

  if (normalized === 'preview') {
    return 'preview';
  }

  return 'production';
}

export function resolveUrlFromTarget(config: {
  target: WebApiTarget;
  prodUrl: string;
  previewUrl: string;
}): string {
  const previewUrl = config.previewUrl.trim();

  if (config.target === 'preview' && previewUrl.length > 0) {
    return previewUrl;
  }

  return config.prodUrl;
}

export function resolveWebApiUrlFromTarget(config: {
  webApiTarget: WebApiTarget;
  webApiUrl: string;
  previewWebApiUrl: string;
}): string {
  return resolveUrlFromTarget({
    target: config.webApiTarget,
    prodUrl: config.webApiUrl,
    previewUrl: config.previewWebApiUrl,
  });
}
