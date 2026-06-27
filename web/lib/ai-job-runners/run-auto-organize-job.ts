import { AUTO_ORGANIZE_CHARGED_USAGE_UNITS } from '@/lib/auto-organize-types';
import { decrementBy, getAutoOrganizeWeeklyKey } from '@/lib/ai-rate-limit';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { saveMessage } from '@/lib/redis';
import { redis } from '@/lib/redis';
import { isProDevice } from '@/lib/pro-entitlement';
import { processAutoOrganizeFolders } from '@/services/ai.service';
import { SYSTEM_MICRO_TASK_MODEL } from '@/config/constants';
import type { AutoOrganizeJobPayload } from '@/types/ai-job';
import type { AutoOrganizeMessage, Message } from '@/types';

export async function decrementAutoOrganizeWeekly(deviceId: string): Promise<void> {
  const pro = await isProDevice(deviceId);
  if (pro) return;
  const key = getAutoOrganizeWeeklyKey(deviceId);
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
      const chargedUsageUnits = payload.chargedUsageUnits ?? AUTO_ORGANIZE_CHARGED_USAGE_UNITS;
      await decrementBy(deviceId, chargedUsageUnits, {
        operation: 'auto_organize',
        jobId: id,
        metadata: { chargedUsageUnits },
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
