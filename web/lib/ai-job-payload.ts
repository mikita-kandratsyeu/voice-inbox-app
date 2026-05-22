import { JOB_PAYLOAD_KEY_PREFIX } from '@/config/constants';
import { redis } from '@/lib/redis';
import type { AiJobEnvelope, AiJobPayload } from '@/types/ai-job';

export function getJobPayloadKey(jobId: string): string {
  return `${JOB_PAYLOAD_KEY_PREFIX}${jobId}`;
}

export function envelopeFromPayload(payload: AiJobPayload): AiJobEnvelope {
  return {
    jobId: payload.jobId,
    operation: payload.operation,
    deviceId: payload.deviceId,
    messageTtlSeconds: payload.messageTtlSeconds,
  };
}

export async function saveJobPayload(payload: AiJobPayload): Promise<void> {
  const key = getJobPayloadKey(payload.jobId);
  await redis.set(key, JSON.stringify(payload), { ex: payload.messageTtlSeconds });
}

export async function getJobPayload(jobId: string): Promise<AiJobPayload | null> {
  const raw = await redis.get(getJobPayloadKey(jobId));
  if (!raw) return null;

  try {
    if (typeof raw === 'object' && raw !== null) {
      return raw as AiJobPayload;
    }
    return JSON.parse(raw as string) as AiJobPayload;
  } catch {
    return null;
  }
}

export async function deleteJobPayload(jobId: string): Promise<void> {
  await redis.del(getJobPayloadKey(jobId));
}
