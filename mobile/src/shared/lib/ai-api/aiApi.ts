import { WEB_API_SECRET, WEB_API_URL } from '@env';
import { getUniqueId } from 'react-native-device-info';

type AiApiRequestBody = {
  id: string;
  transcript: string;
  model: string;
  systemPrompt: string;
};

type AiApiSuccessResponse = {
  id: string;
  status: 'processing';
  syncToken?: string;
};

type AiApiLimitResponse = {
  error: string;
  usage: {
    used: number;
    limit: number;
    resetAt: string;
  };
};

export type AiApiResult =
  | { ok: true; data: AiApiSuccessResponse }
  | { ok: false; limitExceeded: true; usage: AiApiLimitResponse['usage'] }
  | { ok: false; limitExceeded?: false; error: string };

export type AiTask = {
  title: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string | null;
};

export type AiProcessingResult = {
  summary: string;
  tasks: AiTask[];
};

export type AiMessageResult =
  | { ok: true; result: AiProcessingResult }
  | { ok: false; error: string };

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

type MessageResponse =
  | { id: string; status: 'processing' }
  | { id: string; status: 'done'; summary: string; tasks: AiTask[] }
  | { id: string; status: 'error'; error: string };

async function getDeviceId(): Promise<string> {
  return getUniqueId();
}

export async function postAiMessage(body: AiApiRequestBody): Promise<AiApiResult> {
  const deviceId = await getDeviceId();

  let response: Response;
  try {
    response = await fetch(`${WEB_API_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': WEB_API_SECRET ?? '',
        'x-device-id': deviceId,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }

  if (response.status === 429) {
    const json = (await response.json()) as AiApiLimitResponse;
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as AiApiSuccessResponse;
  return { ok: true, data };
}

export async function pollAiMessage(id: string, syncToken?: string): Promise<AiMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let response: Response;
    try {
      response = await fetch(`${WEB_API_URL}/api/messages/${id}`, { headers });
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    const msg = (await response.json()) as MessageResponse;

    if (msg.status === 'done') {
      return { ok: true, result: { summary: msg.summary, tasks: msg.tasks } };
    }

    if (msg.status === 'error') {
      return { ok: false, error: msg.error };
    }
  }

  return { ok: false, error: 'Timeout waiting for AI result' };
}
