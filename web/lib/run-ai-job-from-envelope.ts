import { aiJobRunContext } from '@/lib/ai-job-context';
import { isAiJobCancelled } from '@/lib/ai-job-cancel';
import { runAiJob } from '@/lib/ai-job-runners';
import { acquireJobLock, releaseJobLock } from '@/lib/ai-job-lock';
import { deleteJobPayload, getJobPayload } from '@/lib/ai-job-payload';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { deleteMeetingJobPayload, getMeetingJobPayload } from '@/lib/meeting-job-payload';
import { getOpenRouterPendingGeneration } from '@/lib/openrouter-recovery';
import { getMessage, saveMessage } from '@/lib/redis';
import type { AiJobEnvelope } from '@/types/ai-job';
import type { Message, MeetingDialogueStatus } from '@/types';

export type RunAiJobFromEnvelopeResult =
  | { ok: true; skipped?: boolean; skipReason?: 'done' | 'lock' | 'cancelled' }
  | { ok: false; error: string; retryable: boolean };

/**
 * Loads staged payload and runs the AI job. Used by QStash worker and `after()` fallback.
 */
export async function runAiJobFromEnvelope(
  envelope: AiJobEnvelope,
  options?: { skipIdempotency?: boolean },
): Promise<RunAiJobFromEnvelopeResult> {
  const { jobId, operation } = envelope;
  const started = Date.now();

  if (await isAiJobCancelled(jobId)) {
    return { ok: true, skipped: true, skipReason: 'cancelled' };
  }

  if (!options?.skipIdempotency) {
    const existing = await getMessage(jobId);

    if (operation === 'meeting_dialogue') {
      if (existing?.status === 'done') {
        const mdStatus = (existing as { meetingDialogueStatus?: MeetingDialogueStatus })
          .meetingDialogueStatus;
        if (mdStatus === 'done' || mdStatus === 'failed' || mdStatus === 'skipped') {
          return { ok: true, skipped: true, skipReason: 'done' };
        }
      } else {
        return {
          ok: false,
          error: 'Meeting dialogue requires completed summarize message',
          retryable: true,
        };
      }
    } else if (existing?.status === 'done') {
      return { ok: true, skipped: true, skipReason: 'done' };
    }

    // Prior attempt may have written `error` before retryable handling was fixed — allow QStash retry
    // when OpenRouter generation recovery is still pending.
    if (existing?.status === 'error') {
      const pendingGen = await getOpenRouterPendingGeneration(jobId);
      if (!pendingGen) {
        return { ok: true, skipped: true, skipReason: 'done' };
      }

      const model =
        typeof (existing as { model?: unknown }).model === 'string'
          ? (existing as { model: string }).model
          : undefined;

      await saveMessage(
        jobId,
        {
          id: jobId,
          status: 'processing',
          ...(model ? { model } : {}),
        } as Message,
        envelope.messageTtlSeconds,
      );
    }
  }

  const lockAcquired = await acquireJobLock(jobId);
  if (!lockAcquired) {
    return { ok: true, skipped: true, skipReason: 'lock' };
  }

  try {
    if (await isAiJobCancelled(jobId)) {
      return { ok: true, skipped: true, skipReason: 'cancelled' };
    }

    const payload =
      operation === 'meeting_dialogue'
        ? await getMeetingJobPayload(jobId)
        : await getJobPayload(jobId);
    if (!payload || payload.operation !== operation) {
      return {
        ok: false,
        error: 'Job payload missing or operation mismatch',
        retryable: true,
      };
    }

    console.info('[AI job worker]', JSON.stringify({ operation, jobId, phase: 'start' }));

    try {
      await aiJobRunContext.run({ jobId, messageTtlSeconds: envelope.messageTtlSeconds }, () =>
        runAiJob(payload),
      );
      if (operation === 'meeting_dialogue') {
        await deleteMeetingJobPayload(jobId);
      } else {
        await deleteJobPayload(jobId);
      }
      console.info(
        '[AI job worker]',
        JSON.stringify({ operation, jobId, phase: 'done', durationMs: Date.now() - started }),
      );
      return { ok: true };
    } catch (err) {
      console.error(
        '[AI job worker]',
        JSON.stringify({
          operation,
          jobId,
          phase: 'error',
          durationMs: Date.now() - started,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      const retryable = isRetryableAiJobError(err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        retryable,
      };
    }
  } finally {
    await releaseJobLock(jobId);
  }
}
