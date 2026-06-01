import { clearAiJobCancelled } from '@/lib/ai-job-cancel';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { releaseJobLock } from '@/lib/ai-job-lock';
import { saveMeetingJobPayload } from '@/lib/meeting-job-payload';
import type { MeetingDialogueJobPayload } from '@/types/ai-job';

export async function dispatchMeetingDialogueJob(
  payload: MeetingDialogueJobPayload,
): Promise<void> {
  await clearAiJobCancelled(payload.jobId);
  await releaseJobLock(payload.jobId);
  await saveMeetingJobPayload(payload);
  const deduplicationId = payload.retryNonce?.trim()
    ? `${payload.jobId}-meeting-dialogue-${payload.retryNonce.trim()}`
    : `${payload.jobId}-meeting-dialogue`;
  await dispatchAiJob(payload, { deduplicationId });
}
