import { sendLimitExceededPush } from '@/lib/push-tokens';
import { MESSAGE_TTL_SECONDS } from '@/config/constants';
import { checkAndIncrement } from '@/lib/ai-rate-limit';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveJobPayload } from '@/lib/ai-job-payload';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import type { RecordingMarkForPrompt } from '@/lib/recording-marks-prompt';
import type { AskJobPayload } from '@/types/ai-job';
import type { AskMessage, Message } from '@/types';

type CreateAskResult =
  | { created: true; syncToken?: string }
  | { created: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { created: false };

export const createAsk = async (
  id: string,
  transcript: string,
  question: string,
  model: string,
  deviceId: string,
  summary?: string,
  tasks?: { text: string }[],
  priorTurns?: { question: string; answer: string }[],
  clientUserAgent?: string | null,
  messageTtlSeconds: number = MESSAGE_TTL_SECONDS,
  recordingMarks?: RecordingMarkForPrompt[],
): Promise<CreateAskResult> => {
  const ttl = messageTtlSeconds;

  const saveAskMessage = (msgId: string, data: AskMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  const created = await saveMessageIfNotExists(
    id,
    {
      id,
      status: 'processing',
      model,
    } as unknown as Message,
    ttl,
  );

  if (!created) {
    return { created: false };
  }

  const limitResult = await checkAndIncrement(deviceId);

  if (!limitResult.allowed) {
    await saveAskMessage(id, {
      id,
      status: 'error',
      error: 'Weekly AI limit reached',
      model,
    });
    await sendLimitExceededPush(deviceId);

    return { created: false, limitExceeded: true, usage: limitResult.usage };
  }

  const syncToken = getSyncToken();

  const jobPayload: AskJobPayload = {
    operation: 'transcript_ask',
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
  };

  await saveJobPayload(jobPayload);
  await dispatchAiJob(jobPayload);

  return { created: true, syncToken };
};

export const getAskById = async (id: string, syncToken?: string): Promise<AskMessage | null> => {
  const raw = await getMessage(id, syncToken);
  if (!raw) return null;

  const msg = raw as {
    id?: string;
    status?: string;
    model?: string;
    answer?: string;
    error?: string;
  };
  if (!msg?.id || !msg?.status) return null;

  const modelField =
    typeof msg.model === 'string' && msg.model.trim() ? msg.model.trim() : undefined;

  if (msg.status === 'processing') {
    return { id: msg.id, status: 'processing', ...(modelField ? { model: modelField } : {}) };
  }
  if (msg.status === 'done' && typeof msg.answer === 'string') {
    return {
      id: msg.id,
      status: 'done',
      answer: msg.answer,
      ...(modelField ? { model: modelField } : {}),
    };
  }
  if (msg.status === 'error' && typeof msg.error === 'string') {
    return {
      id: msg.id,
      status: 'error',
      error: msg.error,
      ...(modelField ? { model: modelField } : {}),
    };
  }

  return null;
};
