import { after } from 'next/server';

import { AI_JOB_QSTASH_RETRIES, BASE_URL_OR_FALLBACK } from '@/config/constants';
import { markAiJobFailed } from '@/lib/ai-job-fail';
import { envelopeFromPayload } from '@/lib/ai-job-payload';
import { runAiJobFromEnvelope } from '@/lib/run-ai-job-from-envelope';
import { getAiJobWorkerUrl, getQStashClient, shouldUseQStashTransport } from '@/lib/qstash';
import type { AiJobPayload } from '@/types/ai-job';

export async function dispatchAiJob(payload: AiJobPayload): Promise<void> {
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

    try {
      await client.publishJSON({
        url: getAiJobWorkerUrl(),
        body: envelope,
        retries: AI_JOB_QSTASH_RETRIES,
        timeout: '300s',
        // QStash rejects ':' in deduplicationId; keep summarize vs meeting_dialogue distinct.
        deduplicationId:
          envelope.operation === 'meeting_dialogue'
            ? `${envelope.jobId}-meeting-dialogue`
            : envelope.jobId,
      });
      return;
    } catch (err) {
      console.error('[AI job] QStash publish failed, falling back to after()', {
        jobId: envelope.jobId,
        error: err instanceof Error ? err.message : String(err),
        baseUrl: BASE_URL_OR_FALLBACK,
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
