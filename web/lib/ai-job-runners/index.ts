import { runAskJob } from '@/lib/ai-job-runners/run-ask-job';
import { runAutoOrganizeJob } from '@/lib/ai-job-runners/run-auto-organize-job';
import { runMeetingDialogueJob } from '@/lib/ai-job-runners/run-meeting-dialogue-job';
import { runSummarizeJob } from '@/lib/ai-job-runners/run-summarize-job';
import type { AiJobPayload } from '@/types/ai-job';

export async function runAiJob(payload: AiJobPayload): Promise<void> {
  switch (payload.operation) {
    case 'transcript_summarize':
      await runSummarizeJob(payload);
      break;
    case 'transcript_ask':
      await runAskJob(payload);
      break;
    case 'folder_auto_organize':
      await runAutoOrganizeJob(payload);
      break;
    case 'meeting_dialogue':
      await runMeetingDialogueJob(payload);
      break;
    default: {
      const _exhaustive: never = payload;
      throw new Error(`Unknown AI job operation: ${(_exhaustive as AiJobPayload).operation}`);
    }
  }
}
