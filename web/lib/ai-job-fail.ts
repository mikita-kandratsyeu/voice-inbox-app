import { decrement, decrementBy } from '@/lib/ai-rate-limit';
import { decrementAutoOrganizeWeekly } from '@/lib/ai-job-runners/run-auto-organize-job';
import { deleteJobPayload, getJobPayload } from '@/lib/ai-job-payload';
import { deleteMeetingJobPayload } from '@/lib/meeting-job-payload';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import type { AiUsageOperation } from '@/lib/ai-usage-ledger';
import { getMessage, saveMessage } from '@/lib/redis';
import type { AiJobEnvelope } from '@/types/ai-job';
import type { Message } from '@/types';

const toLedgerOperation = (operation: AiJobEnvelope['operation']): AiUsageOperation =>
  operation === 'folder_auto_organize'
    ? 'auto_organize'
    : operation === 'meeting_dialogue_retry'
      ? 'meeting_dialogue'
      : operation;

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
    await decrement(deviceId, {
      operation: 'meeting_dialogue',
      jobId,
      description: 'Meeting dialogue generation failed',
    });
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
    const payload = await getJobPayload(jobId);
    const refundUnits =
      payload?.operation === 'transcript_summarize' ? (payload.chargedUsageUnits ?? 1) : 1;
    await decrementBy(deviceId, refundUnits, {
      operation: toLedgerOperation(operation),
      jobId,
      metadata: { chargedUsageUnits: refundUnits },
    });
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
    await decrement(deviceId, {
      operation: toLedgerOperation(operation),
      jobId,
    });
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
