import { WEB_API_SECRET, WEB_API_URL } from '@env';
import { getUniqueId } from 'react-native-device-info';

type AskApiRequestBody = {
  id: string;
  transcript: string;
  question: string;
  model: string;
};

type AskApiSuccessResponse = {
  id: string;
  status: 'processing';
  syncToken?: string;
};

type AskApiLimitResponse = {
  error: string;
  usage: {
    used: number;
    limit: number;
    resetAt: string;
  };
};

export type AskApiResult =
  | { ok: true; data: AskApiSuccessResponse }
  | { ok: false; limitExceeded: true; usage: AskApiLimitResponse['usage'] }
  | { ok: false; limitExceeded?: false; error: string };

export type AskMessageResult =
  | { ok: true; result: { answer: string } }
  | { ok: false; error: string };

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

type AskResponse =
  | { id: string; status: 'processing' }
  | { id: string; status: 'done'; answer: string }
  | { id: string; status: 'error'; error: string };

async function getDeviceId(): Promise<string> {
  return getUniqueId();
}

export async function postAskQuestion(body: AskApiRequestBody): Promise<AskApiResult> {
  const deviceId = await getDeviceId();
  const url = `${WEB_API_URL}/api/ask`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': WEB_API_SECRET ?? '',
        'x-device-id': deviceId,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    console.warn('[AI] postAskQuestion: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const json = (await response.json()) as AskApiLimitResponse;
    console.warn('[AI] postAskQuestion: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    console.warn('[AI] postAskQuestion: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as AskApiSuccessResponse;

  return { ok: true, data };
}

export async function pollAskResult(id: string, syncToken?: string): Promise<AskMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${WEB_API_URL}/api/ask/${id}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch (err) {
      console.warn('[AI] pollAskResult: fetch failed', { id, error: String(err) });
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      console.warn('[AI] pollAskResult: HTTP error', { id, status: response.status, body: text });
      continue;
    }

    const msg = (await response.json()) as AskResponse;

    if (msg.status === 'done') {
      return { ok: true, result: { answer: msg.answer } };
    }

    if (msg.status === 'error') {
      console.warn('[AI] pollAskResult: server error', { id, error: msg.error });
      return { ok: false, error: msg.error };
    }
  }

  console.warn('[AI] pollAskResult: timeout', { id });
  return { ok: false, error: 'Timeout waiting for AI result' };
}
