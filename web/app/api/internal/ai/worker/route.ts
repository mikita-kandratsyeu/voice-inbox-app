import { NextResponse } from 'next/server';

import { markAiJobFailed } from '@/lib/ai-job-fail';
import { runAiJobFromEnvelope } from '@/lib/run-ai-job-from-envelope';
import { isLastQStashDelivery, parseUpstashRetried, verifyQStashRequest } from '@/lib/qstash';
import type { AiJobEnvelope } from '@/types/ai-job';
import type { AiOperation } from '@/lib/ai-operation';

export const runtime = 'nodejs';

export const maxDuration = 300;

const AI_OPERATIONS = new Set<string>([
  'transcript_summarize',
  'transcript_ask',
  'inbox_ask',
  'digest',
  'translate',
  'folder_auto_organize',
  'meeting_dialogue',
]);

function parseEnvelope(body: unknown): AiJobEnvelope | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as Record<string, unknown>;
  const jobId = typeof row.jobId === 'string' ? row.jobId.trim() : '';
  const operation = typeof row.operation === 'string' ? row.operation.trim() : '';
  const deviceId = typeof row.deviceId === 'string' ? row.deviceId.trim() : '';
  const messageTtlSeconds =
    typeof row.messageTtlSeconds === 'number' && row.messageTtlSeconds > 0
      ? Math.floor(row.messageTtlSeconds)
      : 0;

  if (!jobId || !deviceId || !messageTtlSeconds) return null;
  if (!AI_OPERATIONS.has(operation)) return null;

  return {
    jobId,
    operation: operation as AiOperation,
    deviceId,
    messageTtlSeconds,
  };
}

export const POST = async (request: Request): Promise<NextResponse> => {
  const bodyText = await request.text();

  const valid = await verifyQStashRequest(request, bodyText);
  if (!valid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const envelope = parseEnvelope(parsed);
  if (!envelope) {
    return NextResponse.json({ error: 'invalid_envelope' }, { status: 400 });
  }

  const retried = parseUpstashRetried(request);
  const result = await runAiJobFromEnvelope(envelope);

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      ...(result.skipped ? { skipped: true, skipReason: result.skipReason } : {}),
    });
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
        error: result.error,
      }),
    );
    return NextResponse.json({ ok: true, failed: true, error: result.error });
  }

  if (result.retryable) {
    return NextResponse.json({ error: result.error, retried }, { status: 500 });
  }

  return NextResponse.json({ ok: true, error: result.error });
};
