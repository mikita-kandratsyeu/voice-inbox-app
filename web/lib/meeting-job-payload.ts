import { MEETING_JOB_PAYLOAD_KEY_PREFIX } from '@/config/constants';
import { redis } from '@/lib/redis';
import type { MeetingDialogueJobPayload } from '@/types/ai-job';

export function getMeetingJobPayloadKey(jobId: string): string {
  return `${MEETING_JOB_PAYLOAD_KEY_PREFIX}${jobId}`;
}

export async function saveMeetingJobPayload(payload: MeetingDialogueJobPayload): Promise<void> {
  const key = getMeetingJobPayloadKey(payload.jobId);
  await redis.set(key, JSON.stringify(payload), { ex: payload.messageTtlSeconds });
}

export async function getMeetingJobPayload(
  jobId: string,
): Promise<MeetingDialogueJobPayload | null> {
  const raw = await redis.get(getMeetingJobPayloadKey(jobId));
  if (!raw) return null;

  try {
    if (typeof raw === 'object' && raw !== null) {
      return raw as MeetingDialogueJobPayload;
    }
    return JSON.parse(raw as string) as MeetingDialogueJobPayload;
  } catch {
    return null;
  }
}

export async function deleteMeetingJobPayload(jobId: string): Promise<void> {
  await redis.del(getMeetingJobPayloadKey(jobId));
}
