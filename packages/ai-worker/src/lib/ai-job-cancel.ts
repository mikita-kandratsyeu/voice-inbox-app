import { AI_JOB_CANCELLED_ERROR, JOB_CANCELLED_KEY_PREFIX } from '@/config/constants';
import { releaseJobLock } from '@/lib/ai-job-lock';
import { deleteJobPayload, getJobPayload } from '@/lib/ai-job-payload';
import { deleteMeetingJobPayload, getMeetingJobPayload } from '@/lib/meeting-job-payload';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { getMessage, saveMessage } from '@/lib/redis';
import { redis } from '@/lib/redis';
import type { Message, MeetingDialogueStatus } from '@/types';

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

/** Clears a stale cancel flag when starting a new meeting-dialogue attempt for the same job id. */
export async function clearAiJobCancelled(jobId: string): Promise<void> {
  await redis.del(getJobCancelledKey(jobId));
}

export type CancelAiJobResult =
  | { ok: true; cancelled: true }
  | { ok: true; cancelled: false; reason: 'not_found' | 'not_processing' }
  | { ok: false; forbidden: true };

function readMeetingDialogueStatus(msg: Message): MeetingDialogueStatus | undefined {
  if (msg.status !== 'done') return undefined;
  const md = (msg as { meetingDialogueStatus?: unknown }).meetingDialogueStatus;
  if (md === 'processing' || md === 'done' || md === 'failed' || md === 'skipped') {
    return md;
  }
  return undefined;
}

export async function cancelAiJob(jobId: string, deviceId: string): Promise<CancelAiJobResult> {
  const summarizePayload = await getJobPayload(jobId);
  const meetingPayload = await getMeetingJobPayload(jobId);
  const ownerDeviceId = summarizePayload?.deviceId ?? meetingPayload?.deviceId;
  if (ownerDeviceId && ownerDeviceId !== deviceId) {
    return { ok: false, forbidden: true };
  }

  const existing = await getMessage(jobId);
  if (!existing) {
    return { ok: true, cancelled: false, reason: 'not_found' };
  }

  const ttl = summarizePayload?.messageTtlSeconds ?? meetingPayload?.messageTtlSeconds ?? 3600;

  if (existing.status === 'done') {
    if (readMeetingDialogueStatus(existing) !== 'processing') {
      return { ok: true, cancelled: false, reason: 'not_processing' };
    }

    await redis.set(getJobCancelledKey(jobId), '1', { ex: ttl });
    await saveMessage(
      jobId,
      {
        ...(existing as Extract<Message, { status: 'done' }>),
        meetingDialogueStatus: 'skipped',
      },
      ttl,
    );
    await deleteMeetingJobPayload(jobId);
    await releaseJobLock(jobId);
    await clearAiJobCancelled(jobId);

    console.info(
      '[AI job]',
      JSON.stringify({ jobId, phase: 'cancelled_meeting_dialogue', deviceId }),
    );
    return { ok: true, cancelled: true };
  }

  if (existing.status !== 'processing') {
    return { ok: true, cancelled: false, reason: 'not_processing' };
  }

  const model =
    'model' in existing && typeof existing.model === 'string' ? existing.model : undefined;

  await redis.set(getJobCancelledKey(jobId), '1', { ex: ttl });
  await saveMessage(
    jobId,
    {
      id: jobId,
      status: 'error',
      error: AI_JOB_CANCELLED_ERROR,
      ...(model ? aiModelResponseFields(model) : {}),
    } as Message,
    ttl,
  );

  await releaseJobLock(jobId);
  await deleteJobPayload(jobId);
  await deleteMeetingJobPayload(jobId);

  console.info('[AI job]', JSON.stringify({ jobId, phase: 'cancelled', deviceId }));

  return { ok: true, cancelled: true };
}
