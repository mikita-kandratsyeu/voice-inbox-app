import { checkAndIncrement, decrement, getResetAt } from '@/lib/ai-rate-limit';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveJobPayload } from '@/lib/ai-job-payload';
import { isProDevice } from '@/lib/pro-entitlement';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import { redis } from '@/lib/redis';
import type { AutoOrganizeJobPayload } from '@/types/ai-job';
import type { AutoOrganizeMessage, AutoOrganizeResult, Message } from '@/types';
import { MESSAGE_TTL_SECONDS, WEEK_TTL_SECONDS } from '@/config/constants';

const AUTO_ORGANIZE_FREE_WEEKLY_LIMIT = 2;
const AUTO_ORGANIZE_WEEKLY_KEY_PREFIX = 'ai_auto_organize_weekly:';

type CreateAutoOrganizeResult =
  | { created: true; syncToken?: string }
  | {
      created: false;
      limitExceeded: true;
      reason: 'weekly_generation_limit' | 'auto_organize_free_limit';
      usage: import('@/lib/ai-rate-limit').AiUsage;
    }
  | { created: false };

function getAutoOrganizeWeekKey(deviceId: string): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${AUTO_ORGANIZE_WEEKLY_KEY_PREFIX}${deviceId}:${d.getUTCFullYear()}:${weekNo}`;
}

async function checkAndIncrementAutoOrganize(
  deviceId: string,
): Promise<{ allowed: true } | { allowed: false; usage: import('@/lib/ai-rate-limit').AiUsage }> {
  const pro = await isProDevice(deviceId);
  if (pro) {
    return { allowed: true };
  }

  const key = getAutoOrganizeWeekKey(deviceId);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WEEK_TTL_SECONDS);
  }

  const resetAt = getResetAt();
  if (count > AUTO_ORGANIZE_FREE_WEEKLY_LIMIT) {
    await redis.decr(key);
    return {
      allowed: false,
      usage: {
        used: AUTO_ORGANIZE_FREE_WEEKLY_LIMIT,
        limit: AUTO_ORGANIZE_FREE_WEEKLY_LIMIT,
        remaining: 0,
        resetAt: resetAt.toISOString(),
        resetAtUtc: resetAt.toISOString().replace('T', ' ').replace('.000Z', ' UTC'),
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

  const generationLimitResult = await checkAndIncrement(deviceId);
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
    await decrement(deviceId);
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
  };

  if (!msg?.id || !msg?.status) return null;
  if (msg.status === 'processing') return { id: msg.id, status: 'processing' };
  if (msg.status === 'error' && typeof msg.error === 'string') {
    return { id: msg.id, status: 'error', error: msg.error };
  }
  if (msg.status === 'done' && msg.result && typeof msg.result === 'object') {
    return { id: msg.id, status: 'done', result: msg.result };
  }

  return null;
};
