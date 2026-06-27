import { AUTO_ORGANIZE_CHARGED_USAGE_UNITS } from '@/lib/auto-organize-types';
import {
  checkAndIncrement,
  decrementBy,
  getAutoOrganizeWeeklyKey,
  resolveDeviceUsagePeriod,
} from '@/lib/ai-rate-limit';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveJobPayload } from '@/lib/ai-job-payload';
import { isProDevice } from '@/lib/pro-entitlement';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import { redis } from '@/lib/redis';
import type { AutoOrganizeMode, AutoOrganizeTemplate } from '@/lib/auto-organize-types';
import { normalizeAutoOrganizeTemplate } from '@/lib/auto-organize-types';
import type { AutoOrganizeJobPayload } from '@/types/ai-job';
import type { AutoOrganizeMessage, AutoOrganizeResult, Message } from '@/types';
import { MESSAGE_TTL_SECONDS, SYSTEM_MICRO_TASK_MODEL, WEEK_TTL_SECONDS } from '@/config/constants';

const AUTO_ORGANIZE_FREE_WEEKLY_LIMIT = 2;

type CreateAutoOrganizeResult =
  | { created: true; syncToken?: string }
  | {
      created: false;
      limitExceeded: true;
      reason: 'weekly_generation_limit' | 'auto_organize_free_limit';
      usage: import('@/lib/ai-rate-limit').AiUsage;
    }
  | { created: false };

async function checkAndIncrementAutoOrganize(
  deviceId: string,
): Promise<{ allowed: true } | { allowed: false; usage: import('@/lib/ai-rate-limit').AiUsage }> {
  const pro = await isProDevice(deviceId);
  if (pro) {
    return { allowed: true };
  }

  const period = await resolveDeviceUsagePeriod(deviceId);
  const key = getAutoOrganizeWeeklyKey(deviceId);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WEEK_TTL_SECONDS);
  }

  if (count > AUTO_ORGANIZE_FREE_WEEKLY_LIMIT) {
    await redis.decr(key);
    return {
      allowed: false,
      usage: {
        used: AUTO_ORGANIZE_FREE_WEEKLY_LIMIT,
        limit: AUTO_ORGANIZE_FREE_WEEKLY_LIMIT,
        remaining: 0,
        resetAt: period.resetAt.toISOString(),
        resetAtUtc: period.resetAt.toISOString().replace('T', ' ').replace('.000Z', ' UTC'),
      },
    };
  }

  return { allowed: true };
}

export const createAutoOrganizeRequest = async (
  id: string,
  notesPayload: string,
  deviceId: string,
  clientUserAgent?: string | null,
  messageTtlSeconds: number = MESSAGE_TTL_SECONDS,
  mode: AutoOrganizeMode = 'full',
  template: AutoOrganizeTemplate = 'general',
): Promise<CreateAutoOrganizeResult> => {
  const ttl = messageTtlSeconds;
  const saveAutoOrganizeMessage = (msgId: string, data: AutoOrganizeMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  const created = await saveMessageIfNotExists(
    id,
    {
      id,
      status: 'processing',
    } as unknown as Message,
    ttl,
  );
  if (!created) return { created: false };

  const generationLimitResult = await checkAndIncrement(
    deviceId,
    undefined,
    AUTO_ORGANIZE_CHARGED_USAGE_UNITS,
    {
      operation: 'auto_organize',
      jobId: id,
      metadata: {
        ...aiModelResponseFields(SYSTEM_MICRO_TASK_MODEL),
        chargedUsageUnits: AUTO_ORGANIZE_CHARGED_USAGE_UNITS,
      },
    },
  );
  if (!generationLimitResult.allowed) {
    await saveAutoOrganizeMessage(id, {
      id,
      status: 'error',
      error: 'Weekly AI limit reached',
    });
    return {
      created: false,
      limitExceeded: true,
      reason: 'weekly_generation_limit',
      usage: generationLimitResult.usage,
    };
  }

  const limitResult = await checkAndIncrementAutoOrganize(deviceId);
  if (!limitResult.allowed) {
    await decrementBy(deviceId, AUTO_ORGANIZE_CHARGED_USAGE_UNITS, {
      operation: 'auto_organize',
      jobId: id,
      description: 'Auto-organize free weekly limit reached',
      metadata: { chargedUsageUnits: AUTO_ORGANIZE_CHARGED_USAGE_UNITS },
    });
    await saveAutoOrganizeMessage(id, {
      id,
      status: 'error',
      error: 'Weekly auto organize limit reached',
    });
    return {
      created: false,
      limitExceeded: true,
      reason: 'auto_organize_free_limit',
      usage: limitResult.usage,
    };
  }

  const syncToken = getSyncToken();

  const jobPayload: AutoOrganizeJobPayload = {
    operation: 'folder_auto_organize',
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    notesPayload,
    clientUserAgent,
    mode,
    template: normalizeAutoOrganizeTemplate(template),
    chargedUsageUnits: AUTO_ORGANIZE_CHARGED_USAGE_UNITS,
  };

  await saveJobPayload(jobPayload);
  await dispatchAiJob(jobPayload);

  return { created: true, syncToken };
};

export const getAutoOrganizeById = async (
  id: string,
  syncToken?: string,
): Promise<AutoOrganizeMessage | null> => {
  const raw = await getMessage(id, syncToken);
  if (!raw) return null;

  const msg = raw as {
    id?: string;
    status?: string;
    result?: AutoOrganizeResult;
    error?: string;
    mode?: AutoOrganizeMode;
  };

  if (!msg?.id || !msg?.status) return null;
  if (msg.status === 'processing') return { id: msg.id, status: 'processing' };
  if (msg.status === 'error' && typeof msg.error === 'string') {
    return { id: msg.id, status: 'error', error: msg.error };
  }
  if (msg.status === 'done' && msg.result && typeof msg.result === 'object') {
    return {
      id: msg.id,
      status: 'done',
      result: msg.result,
      mode: msg.mode ?? 'full',
    };
  }

  return null;
};
