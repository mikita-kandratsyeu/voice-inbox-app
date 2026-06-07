import { decrement } from '@/lib/ai-rate-limit';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { notifyAiJobComplete } from '@/lib/ai-job-push';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { updateAiUsageLedgerMetadata } from '@/lib/ai-usage-ledger';
import { saveMessage } from '@/lib/redis';
import { processAskQuestion } from '@/services/ai.service';
import type { AskJobPayload } from '@/types/ai-job';
import type { AskMessage, Message } from '@/types';

export async function runAskJob(payload: AskJobPayload): Promise<void> {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    question,
    model,
    summary,
    tasks,
    priorTurns,
    clientUserAgent,
    recordingMarks,
  } = payload;

  const saveAskMessage = (msgId: string, data: AskMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  try {
    const result = await processAskQuestion(
      transcript,
      question,
      model,
      summary,
      tasks,
      priorTurns,
      clientUserAgent,
      recordingMarks,
      deviceId,
    );
    await saveAskMessage(id, {
      id,
      status: 'done',
      ...aiModelResponseFields(model),
      answer: result.answer,
      ...(result.answerKind ? { answerKind: result.answerKind } : {}),
      ...(result.items?.length ? { items: result.items } : {}),
      ...(result.evidence?.length ? { evidence: result.evidence } : {}),
      ...(result.suggestedFollowUps?.length
        ? { suggestedFollowUps: result.suggestedFollowUps }
        : {}),
    });

    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: 'Ask complete',
    });

    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: 'transcript_ask',
      jobId: id,
      metadata: {
        ...aiModelResponseFields(model),
        ...(result.tokenUsage ? { tokenUsage: result.tokenUsage } : {}),
      },
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrement(deviceId, {
        operation: 'transcript_ask',
        jobId: id,
        metadata: { model },
      });
      await saveAskMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        ...aiModelResponseFields(model),
      });
    }
    throw err;
  }
}
