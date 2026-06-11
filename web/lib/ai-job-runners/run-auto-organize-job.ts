import { decrement } from '@/lib/ai-rate-limit';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { saveMessage } from '@/lib/redis';
import { redis } from '@/lib/redis';
import { isProDevice } from '@/lib/pro-entitlement';
import { processAutoOrganizeFolders } from '@/services/ai.service';
import { SYSTEM_MICRO_TASK_MODEL } from '@/config/constants';
import type { AutoOrganizeJobPayload } from '@/types/ai-job';
import type { AutoOrganizeMessage, Message } from '@/types';

const AUTO_ORGANIZE_WEEKLY_KEY_PREFIX = 'ai_auto_organize_weekly:';

function getAutoOrganizeWeekKey(deviceId: string): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${AUTO_ORGANIZE_WEEKLY_KEY_PREFIX}${deviceId}:${d.getUTCFullYear()}:${weekNo}`;
}

export async function decrementAutoOrganizeWeekly(deviceId: string): Promise<void> {
  const pro = await isProDevice(deviceId);
  if (pro) return;
  const key = getAutoOrganizeWeekKey(deviceId);
  await redis.decr(key);
}

export async function runAutoOrganizeJob(payload: AutoOrganizeJobPayload): Promise<void> {
  const { jobId: id, deviceId, messageTtlSeconds: ttl, notesPayload, clientUserAgent } = payload;

  const saveAutoOrganizeMessage = (msgId: string, data: AutoOrganizeMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  try {
    const result = await processAutoOrganizeFolders(notesPayload, SYSTEM_MICRO_TASK_MODEL, {
      clientUserAgent,
      mode: payload.mode ?? 'full',
      template: payload.template ?? 'general',
    });
    await saveAutoOrganizeMessage(id, {
      id,
      status: 'done',
      result,
      mode: payload.mode ?? 'full',
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrement(deviceId, {
        operation: 'auto_organize',
        jobId: id,
      });
      await decrementAutoOrganizeWeekly(deviceId);
      await saveAutoOrganizeMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    throw err;
  }
}
