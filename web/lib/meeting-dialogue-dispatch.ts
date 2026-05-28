import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveMeetingJobPayload } from '@/lib/meeting-job-payload';
import type { MeetingDialogueJobPayload } from '@/types/ai-job';

export async function dispatchMeetingDialogueJob(
  payload: MeetingDialogueJobPayload,
): Promise<void> {
  await saveMeetingJobPayload(payload);
  await dispatchAiJob(payload);
}
