import { decrement } from '@/lib/ai-rate-limit';
import { notifyAiJobComplete } from '@/lib/ai-job-push';
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
      model,
      answer: result.answer,
    });

    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: 'Ask complete',
    });
  } catch (err) {
    await decrement(deviceId);
    await saveAskMessage(id, {
      id,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      model,
    });
    throw err;
  }
}
