import { AI_JOB_CANCELLED_ERROR, JOB_CANCELLED_KEY_PREFIX } from '@/config/constants';
import { releaseJobLock } from '@/lib/ai-job-lock';
import { deleteJobPayload, getJobPayload } from '@/lib/ai-job-payload';
import { getMessage, saveMessage } from '@/lib/redis';
import { redis } from '@/lib/redis';
import type { Message } from '@/types';

export function getJobCancelledKey(jobId: string): string {
  return `${JOB_CANCELLED_KEY_PREFIX}${jobId}`;
}

export async function isAiJobCancelled(jobId: string): Promise<boolean> {
  const flag = await redis.get(getJobCancelledKey(jobId));
  if (flag != null && String(flag) === '1') {
    return true;
  }

  const msg = await getMessage(jobId);
  return msg?.status === 'error' && msg.error === AI_JOB_CANCELLED_ERROR;
}

export type CancelAiJobResult =
  | { ok: true; cancelled: true }
  | { ok: true; cancelled: false; reason: 'not_found' | 'not_processing' }
  | { ok: false; forbidden: true };

export async function cancelAiJob(jobId: string, deviceId: string): Promise<CancelAiJobResult> {
  const payload = await getJobPayload(jobId);
  if (payload && payload.deviceId !== deviceId) {
    return { ok: false, forbidden: true };
  }

  const existing = await getMessage(jobId);
  if (!existing) {
    return { ok: true, cancelled: false, reason: 'not_found' };
  }

  if (existing.status !== 'processing') {
    return { ok: true, cancelled: false, reason: 'not_processing' };
  }

  const ttl = payload?.messageTtlSeconds ?? 3600;
  const model =
    'model' in existing && typeof existing.model === 'string' ? existing.model : undefined;

  await redis.set(getJobCancelledKey(jobId), '1', { ex: ttl });
  await saveMessage(
    jobId,
    {
      id: jobId,
      status: 'error',
      error: AI_JOB_CANCELLED_ERROR,
      ...(model ? { model } : {}),
    } as Message,
    ttl,
  );

  await releaseJobLock(jobId);
  await deleteJobPayload(jobId);

  console.info('[AI job]', JSON.stringify({ jobId, phase: 'cancelled', deviceId }));

  return { ok: true, cancelled: true };
}
