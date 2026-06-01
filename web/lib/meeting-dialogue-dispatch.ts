import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveMeetingJobPayload } from '@/lib/meeting-job-payload';
import type { MeetingDialogueJobPayload } from '@/types/ai-job';

export async function dispatchMeetingDialogueJob(
  payload: MeetingDialogueJobPayload,
): Promise<void> {
  await saveMeetingJobPayload(payload);
  const deduplicationId = payload.retryNonce?.trim()
    ? `${payload.jobId}-meeting-dialogue-${payload.retryNonce.trim()}`
    : `${payload.jobId}-meeting-dialogue`;
  await dispatchAiJob(payload, { deduplicationId });
}
