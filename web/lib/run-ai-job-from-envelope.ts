import { aiJobRunContext } from '@/lib/ai-job-context';
import { clearAiJobCancelled, isAiJobCancelled } from '@/lib/ai-job-cancel';
import { runAiJob } from '@/lib/ai-job-runners';
import { acquireJobLock, releaseJobLock } from '@/lib/ai-job-lock';
import { deleteJobPayload, getJobPayload } from '@/lib/ai-job-payload';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { dispatchMeetingDialogueJob } from '@/lib/meeting-dialogue-dispatch';
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
    if (operation === 'meeting_dialogue') {
      const existing = await getMessage(jobId);
      const mdStatus =
        existing?.status === 'done'
          ? (existing as { meetingDialogueStatus?: MeetingDialogueStatus }).meetingDialogueStatus
          : undefined;
      if (mdStatus === 'processing') {
        await clearAiJobCancelled(jobId);
      } else {
        return { ok: true, skipped: true, skipReason: 'cancelled' };
      }
    } else {
      return { ok: true, skipped: true, skipReason: 'cancelled' };
    }
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
      if (operation === 'transcript_summarize') {
        await recoverMeetingDialogueAfterSummarizeDone(jobId, envelope.messageTtlSeconds);
      }
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
    if (operation === 'meeting_dialogue') {
      return { ok: false, error: 'Meeting dialogue job lock held', retryable: true };
    }
    return { ok: true, skipped: true, skipReason: 'lock' };
  }

  try {
    if (await isAiJobCancelled(jobId)) {
      if (operation === 'meeting_dialogue') {
        const existing = await getMessage(jobId);
        const mdStatus =
          existing?.status === 'done'
            ? (existing as { meetingDialogueStatus?: MeetingDialogueStatus }).meetingDialogueStatus
            : undefined;
        if (mdStatus === 'processing') {
          await clearAiJobCancelled(jobId);
        } else {
          return { ok: true, skipped: true, skipReason: 'cancelled' };
        }
      } else {
        return { ok: true, skipped: true, skipReason: 'cancelled' };
      }
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
        await reconcileMeetingDialogueIfStillProcessing(jobId, envelope.messageTtlSeconds);
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

/**
 * Summarize wrote `done` + `meetingDialogueStatus: processing` then crashed before QStash publish.
 * A retried summarize worker would otherwise idempotency-skip and leave speakers stuck.
 */
async function recoverMeetingDialogueAfterSummarizeDone(
  jobId: string,
  messageTtlSeconds: number,
): Promise<void> {
  const existing = await getMessage(jobId);
  if (existing?.status !== 'done') return;

  const mdStatus = (existing as { meetingDialogueStatus?: MeetingDialogueStatus })
    .meetingDialogueStatus;
  if (mdStatus !== 'processing') return;

  const meetingPayload = await getMeetingJobPayload(jobId);
  if (!meetingPayload) {
    console.warn(
      '[AI job worker]',
      JSON.stringify({
        operation: 'transcript_summarize',
        jobId,
        phase: 'recover_meeting_dialogue_missing_payload',
      }),
    );
    await saveMessage(
      jobId,
      {
        ...(existing as Extract<Message, { status: 'done' }>),
        meetingDialogueStatus: 'failed',
      },
      messageTtlSeconds,
    );
    return;
  }

  console.info(
    '[AI job worker]',
    JSON.stringify({
      operation: 'transcript_summarize',
      jobId,
      phase: 'recover_meeting_dialogue_redispatch',
    }),
  );

  await dispatchMeetingDialogueJob({
    ...meetingPayload,
    retryNonce: meetingPayload.retryNonce ?? String(Date.now()),
  });
}

/** Worker returned 200 but left `meetingDialogueStatus: processing` (stale skip / no-op). */
async function reconcileMeetingDialogueIfStillProcessing(
  jobId: string,
  messageTtlSeconds: number,
): Promise<void> {
  const existing = await getMessage(jobId);
  if (existing?.status !== 'done') return;

  const mdStatus = (existing as { meetingDialogueStatus?: MeetingDialogueStatus })
    .meetingDialogueStatus;
  if (mdStatus !== 'processing') return;

  console.warn(
    '[AI job worker]',
    JSON.stringify({ operation: 'meeting_dialogue', jobId, phase: 'reconcile_stuck_processing' }),
  );

  await saveMessage(
    jobId,
    {
      ...(existing as Extract<Message, { status: 'done' }>),
      meetingDialogueStatus: 'failed',
    },
    messageTtlSeconds,
  );
}
