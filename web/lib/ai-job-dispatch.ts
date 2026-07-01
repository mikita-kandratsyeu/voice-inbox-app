import { after } from 'next/server';

import { AI_JOB_QSTASH_RETRIES } from '@/config/constants';
import { markAiJobFailed } from '@/lib/ai-job-fail';
import { envelopeFromPayload } from '@/lib/ai-job-payload';
import { resolveAiJobPublishPlan } from '@/lib/ai-job-publish-plan';
import { runAiJobFromEnvelope } from '@/lib/run-ai-job-from-envelope';
import { getQStashClient, shouldUseQStashTransport } from '@/lib/qstash';
import type { AiJobPayload } from '@/types/ai-job';

export async function dispatchAiJob(
  payload: AiJobPayload,
  options?: { deduplicationId?: string },
): Promise<void> {
  const envelope = envelopeFromPayload(payload);
  const transport = shouldUseQStashTransport() ? 'qstash' : 'after';

  console.info(
    '[AI job]',
    JSON.stringify({
      operation: envelope.operation,
      jobId: envelope.jobId,
      transport,
    }),
  );

  if (transport === 'qstash') {
    const client = getQStashClient();
    if (!client) {
      scheduleAfterFallback(envelope);
      return;
    }

    const plan = resolveAiJobPublishPlan();
    const deduplicationId =
      options?.deduplicationId ??
      (envelope.operation === 'meeting_dialogue'
        ? `${envelope.jobId}-meeting-dialogue`
        : envelope.jobId);

    if (plan.primary) {
      try {
        await client.publishJSON({
          url: plan.primary.url,
          body: envelope,
          retries: AI_JOB_QSTASH_RETRIES,
          timeout: plan.primary.timeoutSeconds,
          failureCallback: plan.primary.failureCallback,
          deduplicationId,
        });
        console.info(
          '[AI job]',
          JSON.stringify({
            operation: envelope.operation,
            jobId: envelope.jobId,
            target: 'cloud_run',
            timeoutSeconds: plan.primary.timeoutSeconds,
            failureCallback: plan.primary.failureCallback,
          }),
        );
        return;
      } catch (err) {
        console.error('[AI job] QStash publish to Cloud Run failed, falling back to Vercel', {
          jobId: envelope.jobId,
          error: err instanceof Error ? err.message : String(err),
          primaryUrl: plan.primary.url,
        });
      }
    }

    try {
      await client.publishJSON({
        url: plan.fallback.url,
        body: envelope,
        retries: AI_JOB_QSTASH_RETRIES,
        timeout: plan.fallback.timeoutSeconds,
        deduplicationId,
      });
      console.info(
        '[AI job]',
        JSON.stringify({
          operation: envelope.operation,
          jobId: envelope.jobId,
          target: 'vercel_fallback',
          timeoutSeconds: plan.fallback.timeoutSeconds,
          fallbackReason: plan.primary ? 'publish_fail' : 'vercel_only',
        }),
      );
      return;
    } catch (err) {
      console.error('[AI job] QStash publish failed, falling back to after()', {
        jobId: envelope.jobId,
        error: err instanceof Error ? err.message : String(err),
        fallbackUrl: plan.fallback.url,
      });
      scheduleAfterFallback(envelope);
      return;
    }
  }

  scheduleAfterFallback(envelope);
}

function scheduleAfterFallback(envelope: ReturnType<typeof envelopeFromPayload>): void {
  after(async () => {
    const result = await runAiJobFromEnvelope(envelope, { skipIdempotency: true });
    // `after()` has no QStash retries — write terminal `error` so clients stop polling `processing`.
    if (!result.ok) {
      await markAiJobFailed(envelope, result.error);
    }
  });
}
