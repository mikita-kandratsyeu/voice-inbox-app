import { sendPushNotification, type PushPayload } from '@/lib/push';
import { getAllDeviceIdsWithPushTokens, getPushTokenWithLocale } from '@/lib/push-tokens';

const VALID_TYPES: PushPayload['type'][] = [
  'ai_complete',
  'policy_update',
  'limit_warning',
  'limit_exceeded',
];

const CONCURRENCY = 20;

export type BroadcastInput = {
  type?: string;
  title?: string;
  body?: string;
  message?: string;
};

export type BroadcastResult = {
  ok: true;
  sent: number;
  failed: number;
  total: number;
};

export function parseBroadcastBody(body: BroadcastInput): PushPayload {
  const type =
    typeof body.type === 'string' && VALID_TYPES.includes(body.type as PushPayload['type'])
      ? (body.type as PushPayload['type'])
      : 'policy_update';
  return {
    type,
    title: typeof body.title === 'string' ? body.title : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
  };
}

export async function runBroadcast(body: BroadcastInput): Promise<BroadcastResult> {
  const payload = parseBroadcastBody(body);
  const deviceIds = await getAllDeviceIdsWithPushTokens();
  const total = deviceIds.length;

  if (total === 0) {
    return { ok: true, sent: 0, failed: 0, total: 0 };
  }

  const sendOne = async (deviceId: string): Promise<boolean> => {
    const data = await getPushTokenWithLocale(deviceId);
    if (!data) return false;
    return sendPushNotification(data.token, payload, data.locale);
  };

  const results: boolean[] = [];
  for (let i = 0; i < deviceIds.length; i += CONCURRENCY) {
    const batch = deviceIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(sendOne));
    results.push(...batchResults);
  }

  const sent = results.filter(Boolean).length;
  const failed = total - sent;
  return { ok: true, sent, failed, total };
}
