import { decrement } from '@/lib/ai-rate-limit';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { notifyAiJobComplete } from '@/lib/ai-job-push';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { updateAiUsageLedgerMetadata } from '@/lib/ai-usage-ledger';
import { saveMessage } from '@/lib/redis';
import { processGeneralAskQuestion } from '@/services/ai.service';
import type { GeneralAskJobPayload } from '@/types/ai-job';
import type { AskMessage, Message } from '@/types';

export async function runGeneralAskJob(payload: GeneralAskJobPayload): Promise<void> {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    question,
    model,
    priorTurns,
    clientUserAgent,
  } = payload;

  const saveAskMessage = (msgId: string, data: AskMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  try {
    const result = await processGeneralAskQuestion(
      question,
      model,
      priorTurns,
      clientUserAgent,
      deviceId,
    );
    await saveAskMessage(id, {
      id,
      status: 'done',
      ...aiModelResponseFields(model),
      ...(payload.modelMode ? { modelMode: payload.modelMode } : {}),
      answer: result.answer,
      ...(result.answerKind ? { answerKind: result.answerKind } : {}),
      ...(result.items?.length ? { items: result.items } : {}),
      ...(result.interpretations?.length ? { interpretations: result.interpretations } : {}),
      ...(result.suggestedFollowUps?.length
        ? { suggestedFollowUps: result.suggestedFollowUps }
        : {}),
    });

    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: 'General ask complete',
    });

    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: 'general_ask',
      jobId: id,
      metadata: aiModelResponseFields(model),
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrement(deviceId, {
        operation: 'general_ask',
        jobId: id,
        metadata: { model },
      });
      await saveAskMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        ...aiModelResponseFields(model),
        ...(payload.modelMode ? { modelMode: payload.modelMode } : {}),
      });
    }
    throw err;
  }
}
