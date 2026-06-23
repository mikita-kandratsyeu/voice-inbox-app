import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { WEB_API_FETCH_TIMEOUT_MS } from '@/shared/lib/api-auth/constants';
import { diagWarn } from '@/shared/lib/appLogger';
import { nitroFetch } from '@/shared/lib/fetch';

import {
  applyBannerFetchedOk,
  applyBannerNotModified304,
  getStoredBannerEtag,
} from './bannerCache';
import { parseMobileBannerManifestString } from './parseManifest';

const BANNER_PATH = '/api/public/mobile-banner';

export async function fetchRemoteBannerManifest(): Promise<void> {
  const base = getWebApiUrl().trim();
  if (!base) {
    return;
  }

  const url = `${base.replace(/\/$/, '')}${BANNER_PATH}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const etag = getStoredBannerEtag();

  if (etag) {
    headers['If-None-Match'] = etag;
  }

  const response = await nitroFetch(url, {
    method: 'GET',
    headers,
    timeoutMs: WEB_API_FETCH_TIMEOUT_MS,
  });
  const now = Date.now();

  if (response.status === 304) {
    applyBannerNotModified304(now);
    return;
  }

  if (!response.ok) {
    diagWarn('[mobile-banner] fetch failed', response.status, url);
    return;
  }

  const text = await response.text();
  const parsed = parseMobileBannerManifestString(text);

  if (!parsed.ok) {
    diagWarn('[mobile-banner] parse failed', parsed.error);
    return;
  }

  const nextEtag = response.headers.get('etag')?.trim() || null;
  applyBannerFetchedOk(parsed.manifest, nextEtag, now);
}
