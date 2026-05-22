import { runAiJob } from '@/lib/ai-job-runners';
import { deleteJobPayload, getJobPayload } from '@/lib/ai-job-payload';
import { getMessage } from '@/lib/redis';
import type { AiJobEnvelope } from '@/types/ai-job';

export type RunAiJobFromEnvelopeResult =
  | { ok: true; skipped?: boolean }
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

  if (!options?.skipIdempotency) {
    const existing = await getMessage(jobId);
    if (existing && existing.status !== 'processing') {
      return { ok: true, skipped: true };
    }
  }

  const payload = await getJobPayload(jobId);
  if (!payload || payload.operation !== operation) {
    return {
      ok: false,
      error: 'Job payload missing or operation mismatch',
      retryable: true,
    };
  }

  console.info('[AI job worker]', JSON.stringify({ operation, jobId, phase: 'start' }));

  try {
    await runAiJob(payload);
    await deleteJobPayload(jobId);
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
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      retryable: false,
    };
  }
}
