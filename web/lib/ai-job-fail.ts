import { decrement } from '@/lib/ai-rate-limit';
import { decrementAutoOrganizeWeekly } from '@/lib/ai-job-runners/run-auto-organize-job';
import { deleteJobPayload } from '@/lib/ai-job-payload';
import { deleteMeetingJobPayload } from '@/lib/meeting-job-payload';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { getMessage, saveMessage } from '@/lib/redis';
import type { AiJobEnvelope } from '@/types/ai-job';
import type { Message } from '@/types';

/**
 * Terminal failure after QStash retries are exhausted (or non-retryable infra error on last attempt).
 * Writes `error` to `msg:{id}` so clients stop polling `processing`.
 */
export async function markAiJobFailed(envelope: AiJobEnvelope, error: string): Promise<void> {
  const { jobId, deviceId, messageTtlSeconds: ttl, operation } = envelope;
  const existing = await getMessage(jobId);
  const model =
    existing && typeof (existing as { model?: string }).model === 'string'
      ? (existing as { model: string }).model
      : undefined;

  if (operation === 'meeting_dialogue') {
    if (existing?.status === 'done') {
      await saveMessage(
        jobId,
        {
          ...(existing as Extract<Message, { status: 'done' }>),
          meetingDialogueStatus: 'failed',
        },
        ttl,
      );
    }
    await deleteMeetingJobPayload(jobId);
    return;
  }

  if (operation === 'transcript_summarize' || operation === 'transcript_ask') {
    await decrement(deviceId);
    await saveMessage(
      jobId,
      {
        id: jobId,
        status: 'error',
        error,
        ...(model ? aiModelResponseFields(model) : {}),
      },
      ttl,
    );
  } else {
    await decrement(deviceId);
    await decrementAutoOrganizeWeekly(deviceId);
    await saveMessage(
      jobId,
      {
        id: jobId,
        status: 'error',
        error,
      } as unknown as Message,
      ttl,
    );
  }

  await deleteJobPayload(jobId);
}
