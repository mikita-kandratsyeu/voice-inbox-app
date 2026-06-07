import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { i18n } from '@/shared/lib';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { devWarn, diagWarn } from '@/shared/lib/appLogger';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';

import { headersForAiOperation } from './aiOperation';

export type TranslateResult =
  | { ok: true; translatedText: string }
  | { ok: false; limitExceeded: true; usage: { used: number; limit: number; resetAt: string } }
  | { ok: false; error: string };

export async function postTranslate(
  transcript: string,
  targetLanguage: string,
): Promise<TranslateResult> {
  const consentOk = await ensureCloudAiThirdPartyConsent();
  if (!consentOk) {
    return { ok: false, error: i18n.t('cloudAiConsent.declinedHint') };
  }

  const url = `${getWebApiUrl()}/api/translate`;

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headersForAiOperation('translate'),
      },
      body: JSON.stringify({ transcript, targetLanguage }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    diagWarn('[Translate] postTranslate: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const json = (await response.json()) as {
      usage: { used: number; limit: number; resetAt: string };
    };
    diagWarn('[Translate] postTranslate: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    devWarn('[Translate] postTranslate: HTTP error', {
      status: response.status,
      body: text,
    });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as { translatedText: string };
  return { ok: true, translatedText: data.translatedText };
}
