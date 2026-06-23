import { decrement } from '@/lib/ai-rate-limit';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { notifyAiJobComplete } from '@/lib/ai-job-push';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { updateAiUsageLedgerMetadata } from '@/lib/ai-usage-ledger';
import { saveJobPayload } from '@/lib/ai-job-payload';
import { saveMessage } from '@/lib/redis';
import { processInboxAskQuestionWithTools } from '@/services/ai.service';
import type { InboxAskJobPayload } from '@/types/ai-job';
import type { AskMessage, Message } from '@/types';

export async function runInboxAskJob(payload: InboxAskJobPayload): Promise<void> {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    corpusNotes,
    question,
    model,
    priorTurns,
    clientUserAgent,
  } = payload;

  const saveAskMessage = (msgId: string, data: AskMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  try {
    const loop = await processInboxAskQuestionWithTools({
      priorTurns,
      corpusNotes,
      question,
      model,
      clientUserAgent,
      deviceId,
      toolMessages: payload.toolMessages,
      toolSteps: payload.toolSteps,
      toolRound: payload.toolRound,
    });

    if (loop.status === 'needs_tool') {
      await saveJobPayload({
        ...payload,
        pendingToolCall: loop.toolCall,
        toolMessages: loop.toolMessages,
        toolSteps: loop.toolSteps,
        toolRound: loop.toolCall.round,
      });
      await saveAskMessage(id, {
        id,
        status: 'needs_tool',
        ...aiModelResponseFields(model),
        ...(payload.modelMode ? { modelMode: payload.modelMode } : {}),
        toolCall: loop.toolCall,
        toolSteps: loop.toolSteps,
      });
      return;
    }

    const result = loop.result;
    await saveAskMessage(id, {
      id,
      status: 'done',
      ...aiModelResponseFields(model),
      ...(payload.modelMode ? { modelMode: payload.modelMode } : {}),
      answer: result.answer,
      ...(result.answerKind ? { answerKind: result.answerKind } : {}),
      ...(result.items?.length ? { items: result.items } : {}),
      ...(result.evidence?.length ? { evidence: result.evidence } : {}),
      ...(result.interpretations?.length ? { interpretations: result.interpretations } : {}),
      ...(result.suggestedFollowUps?.length
        ? { suggestedFollowUps: result.suggestedFollowUps }
        : {}),
      ...(loop.toolSteps?.length ? { toolSteps: loop.toolSteps } : {}),
    });

    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: 'Inbox ask complete',
    });

    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: 'inbox_ask',
      jobId: id,
      metadata: aiModelResponseFields(model),
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrement(deviceId, {
        operation: 'inbox_ask',
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
