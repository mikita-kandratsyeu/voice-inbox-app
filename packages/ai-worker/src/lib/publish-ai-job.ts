import { AI_JOB_QSTASH_RETRIES } from '@/config/constants';
import { envelopeFromPayload } from '@/lib/ai-job-payload';
import { resolveAiJobPublishPlan } from '@/lib/ai-job-publish-plan';
import { getQStashClient } from '@/lib/qstash';
import type { AiJobEnvelope } from '@/types/ai-job';
import type { AiJobPayload } from '@/types/ai-job';

export type PublishAiJobResult =
  | { ok: true; transport: 'qstash' }
  | { ok: false; reason: 'no_client' | 'publish_failed' };

/**
 * Publishes an AI job to QStash (Cloud Run primary, Vercel fallback).
 * No Next.js `after()` — safe for Cloud Run worker code paths.
 */
export async function publishAiJobToQStash(
  payload: AiJobPayload,
  options?: { deduplicationId?: string },
): Promise<PublishAiJobResult> {
  const envelope = envelopeFromPayload(payload);
  const client = getQStashClient();
  if (!client) {
    return { ok: false, reason: 'no_client' };
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
      logPublish(envelope, 'cloud_run', plan.primary.timeoutSeconds, plan.primary.failureCallback);
      return { ok: true, transport: 'qstash' };
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
    logPublish(
      envelope,
      'vercel_fallback',
      plan.fallback.timeoutSeconds,
      undefined,
      plan.primary ? 'publish_fail' : 'vercel_only',
    );
    return { ok: true, transport: 'qstash' };
  } catch (err) {
    console.error('[AI job] QStash publish failed', {
      jobId: envelope.jobId,
      error: err instanceof Error ? err.message : String(err),
      fallbackUrl: plan.fallback.url,
    });
    return { ok: false, reason: 'publish_failed' };
  }
}

function logPublish(
  envelope: AiJobEnvelope,
  target: string,
  timeoutSeconds: number,
  failureCallback?: string,
  fallbackReason?: string,
): void {
  console.info(
    '[AI job]',
    JSON.stringify({
      operation: envelope.operation,
      jobId: envelope.jobId,
      target,
      timeoutSeconds,
      ...(failureCallback ? { failureCallback } : {}),
      ...(fallbackReason ? { fallbackReason } : {}),
    }),
  );
}
