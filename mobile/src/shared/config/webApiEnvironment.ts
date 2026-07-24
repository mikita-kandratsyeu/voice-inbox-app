import { getPreviewWebApiUrl, getWebApiUrl } from './runtimeConfig';

export type WebApiEnvironment = 'dev' | 'preview' | 'production';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isLocalDevWebApiHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.16.') ||
    host.startsWith('172.17.') ||
    host.startsWith('172.18.') ||
    host.startsWith('172.19.') ||
    /^172\.(2[0-9]|3[0-1])\./.test(host)
  );
}

/** Active Web API bucket: local dev, preview/staging, or production. */
export function getWebApiEnvironmentStatus(): WebApiEnvironment {
  const activeUrl = getWebApiUrl().trim();
  if (!activeUrl) {
    return 'production';
  }

  let host = '';
  try {
    host = new URL(activeUrl).hostname.toLowerCase();
  } catch {
    return 'production';
  }

  const previewUrl = getPreviewWebApiUrl().trim();
  if (previewUrl.length > 0) {
    try {
      const previewHost = new URL(previewUrl).hostname.toLowerCase();
      if (host === previewHost || normalizeBaseUrl(activeUrl) === normalizeBaseUrl(previewUrl)) {
        return 'preview';
      }
    } catch {
      // Fall through to local-dev / production checks.
    }
  }

  if (isLocalDevWebApiHost(host)) {
    return 'dev';
  }

  return 'production';
}

export function getWebApiHost(): string {
  const activeUrl = getWebApiUrl().trim();
  if (!activeUrl) {
    return '';
  }

  try {
    return new URL(activeUrl).host;
  } catch {
    return '';
  }
}
