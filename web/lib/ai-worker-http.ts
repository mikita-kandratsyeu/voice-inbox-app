import {
  parseAiJobEnvelope,
  parseQStashFailureCallbackEnvelope,
  resolveEnvelopeFromBody,
} from '@voice-inbox/ai-job-core';
import { markAiJobFailed } from '@/lib/ai-job-fail';
import { runAiJobFromEnvelope } from '@/lib/run-ai-job-from-envelope';
import { isLastQStashDelivery, parseUpstashRetried, verifyQStashRequest } from '@/lib/qstash';
import type { AiJobEnvelope } from '@/types/ai-job';

export type AiWorkerHttpResponse = {
  status: number;
  body: Record<string, unknown>;
};

export { parseAiJobEnvelope, parseQStashFailureCallbackEnvelope, resolveEnvelopeFromBody };

/** Shared AI worker POST handler for Vercel route and Cloud Run server. */
export async function handleAiWorkerPost(request: Request): Promise<AiWorkerHttpResponse> {
  const bodyText = await request.text();

  const valid = await verifyQStashRequest(request, bodyText);
  if (!valid) {
    return { status: 401, body: { error: 'unauthorized' } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { status: 400, body: { error: 'invalid_json' } };
  }

  const envelope = resolveEnvelopeFromBody(parsed) as AiJobEnvelope | null;
  if (!envelope) {
    return { status: 400, body: { error: 'invalid_envelope' } };
  }

  const retried = parseUpstashRetried(request);
  const isFailureCallback = parseAiJobEnvelope(parsed) == null;
  const result = await runAiJobFromEnvelope(envelope);

  if (result.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        ...(isFailureCallback ? { failureCallback: true } : {}),
        ...(result.skipped ? { skipped: true, skipReason: result.skipReason } : {}),
      },
    };
  }

  if (result.retryable && isLastQStashDelivery(retried)) {
    await markAiJobFailed(envelope, result.error);
    console.warn(
      '[AI job worker]',
      JSON.stringify({
        jobId: envelope.jobId,
        operation: envelope.operation,
        phase: 'failed_terminal',
        retried,
        failureCallback: isFailureCallback,
        error: result.error,
      }),
    );
    return { status: 200, body: { ok: true, failed: true, error: result.error } };
  }

  if (result.retryable) {
    return { status: 500, body: { error: result.error, retried } };
  }

  return { status: 200, body: { ok: true, error: result.error } };
}
