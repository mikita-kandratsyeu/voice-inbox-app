import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { nitroFetch } from '@/shared/lib/fetch';

import { parseInAppEventPageResponse } from './parseInAppEventPageResponse';
import type { InAppEventPagePayload } from './types';

export type FetchInAppEventPageResult =
  | { ok: true; page: InAppEventPagePayload }
  | { ok: false; error: 'no_api' | 'not_found' | 'network' | 'invalid_response' | string };

export type InAppEventTheme = 'light' | 'dark';

export function resolveInAppEventLocale(language: string): 'en' | 'ru' {
  return language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export async function fetchInAppEventPage(
  eventId: string,
  options: { locale: string; theme: InAppEventTheme },
): Promise<FetchInAppEventPageResult> {
  const base = getWebApiUrl().trim();
  if (!base) {
    return { ok: false, error: 'no_api' };
  }

  const locale = resolveInAppEventLocale(options.locale);
  const params = new URLSearchParams({
    locale,
    theme: options.theme,
  });
  const url = `${base.replace(/\/$/, '')}/api/public/in-app-events/${encodeURIComponent(eventId)}?${params}`;

  try {
    const response = await nitroFetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json: unknown = await response.json().catch(() => null);
    const parsed = parseInAppEventPageResponse(response.status, json);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    return parsed;
  } catch {
    return { ok: false, error: 'network' };
  }
}
