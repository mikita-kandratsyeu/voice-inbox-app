import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { nitroFetch } from '@/shared/lib/fetch';

import { applyFetchedOk, applyNotModified304, getStoredEtag } from './manifestCache';
import { parseMobileModelManifestString } from './parseManifest';

const MANIFEST_PATH = '/api/public/mobile-model-manifest';

export async function fetchRemoteModelManifest(): Promise<void> {
  const base = getWebApiUrl().trim();

  if (!base) {
    return;
  }

  const url = `${base.replace(/\/$/, '')}${MANIFEST_PATH}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const etag = getStoredEtag();

  if (etag) {
    headers['If-None-Match'] = etag;
  }

  const response = await nitroFetch(url, { method: 'GET', headers });
  const now = Date.now();

  if (response.status === 304) {
    applyNotModified304(now);
    return;
  }

  if (!response.ok) {
    if (__DEV__) console.warn('[model-manifest] fetch failed', response.status, url);

    return;
  }

  const text = await response.text();
  const parsed = parseMobileModelManifestString(text);

  if (!parsed.ok) {
    if (__DEV__) console.warn('[model-manifest] parse failed', parsed.error);
    return;
  }

  const nextEtag = response.headers.get('etag')?.trim() || null;
  applyFetchedOk(parsed.manifest, nextEtag, now);
}
