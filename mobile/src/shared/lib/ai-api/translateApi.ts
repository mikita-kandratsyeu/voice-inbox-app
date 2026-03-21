import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';

export type TranslateResult =
  | { ok: true; translatedText: string }
  | { ok: false; limitExceeded: true; usage: { used: number; limit: number; resetAt: string } }
  | { ok: false; error: string };

export async function postTranslate(
  transcript: string,
  targetLanguage: string,
): Promise<TranslateResult> {
  const url = `${getWebApiUrl()}/api/translate`;

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, targetLanguage }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    if (__DEV__) console.warn('[Translate] postTranslate: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const json = (await response.json()) as {
      usage: { used: number; limit: number; resetAt: string };
    };
    if (__DEV__) console.warn('[Translate] postTranslate: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    if (__DEV__)
      console.warn('[Translate] postTranslate: HTTP error', {
        status: response.status,
        body: text,
      });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as { translatedText: string };
  return { ok: true, translatedText: data.translatedText };
}
