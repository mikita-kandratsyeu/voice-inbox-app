import { WEB_API_SECRET, WEB_API_URL } from '@env';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { fetch } from '@/shared/lib/fetch';

export type TranslateResult =
  | { ok: true; translatedText: string }
  | { ok: false; limitExceeded: true; usage: { used: number; limit: number; resetAt: string } }
  | { ok: false; error: string };

function getDeviceId(): string {
  return DeviceInfoModule.uniqueId;
}

export async function postTranslate(
  transcript: string,
  targetLanguage: string,
): Promise<TranslateResult> {
  const deviceId = getDeviceId();
  const url = `${WEB_API_URL}/api/translate`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': WEB_API_SECRET ?? '',
        'x-device-id': deviceId,
      },
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
