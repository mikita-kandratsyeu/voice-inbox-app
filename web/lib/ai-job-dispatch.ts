import { after } from 'next/server';

import { envelopeFromPayload } from '@/lib/ai-job-payload';
import { publishAiJobToQStash } from '@/lib/publish-ai-job';
import { runAiJobFromEnvelope } from '@/lib/run-ai-job-from-envelope';
import { markAiJobFailed } from '@/lib/ai-job-fail';
import { shouldUseQStashTransport } from '@/lib/qstash';
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
    const published = await publishAiJobToQStash(payload, options);
    if (published.ok) {
      return;
    }
    scheduleAfterFallback(envelope);
    return;
  }

  scheduleAfterFallback(envelope);
}

function scheduleAfterFallback(envelope: ReturnType<typeof envelopeFromPayload>): void {
  after(async () => {
    const result = await runAiJobFromEnvelope(envelope, { skipIdempotency: true });
    if (!result.ok) {
      await markAiJobFailed(envelope, result.error);
    }
  });
}
