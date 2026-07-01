import { clearAiJobCancelled } from '@/lib/ai-job-cancel';
import { releaseJobLock } from '@/lib/ai-job-lock';
import { saveMeetingJobPayload } from '@/lib/meeting-job-payload';
import { publishAiJobToQStash } from '@/lib/publish-ai-job';
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
  await publishAiJobToQStash(payload, { deduplicationId });
}
