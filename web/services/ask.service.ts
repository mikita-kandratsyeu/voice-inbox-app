import { sendLimitExceededPush } from '@/lib/push-tokens';
import { MESSAGE_TTL_SECONDS } from '@/config/constants';
import { checkAndIncrement, type AiLimitContext } from '@/lib/ai-rate-limit';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveJobPayload } from '@/lib/ai-job-payload';
import { aiModelResponseFields, enrichMessageWithModelLabel } from '@/lib/ai-model-display';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import type { RecordingMarkForPrompt } from '@/lib/recording-marks-prompt';
import type { AskJobPayload } from '@/types/ai-job';
import type { AskMessage, Message } from '@/types';

type AskEvidenceMessageItem = NonNullable<
  Extract<AskMessage, { status: 'done' }>['evidence']
>[number];

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
  aiLimitContext?: AiLimitContext,
): Promise<CreateAskResult> => {
  const ttl = messageTtlSeconds;

  const saveAskMessage = (msgId: string, data: AskMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  const created = await saveMessageIfNotExists(
    id,
    {
      id,
      status: 'processing',
      ...aiModelResponseFields(model),
    } as unknown as Message,
    ttl,
  );

  if (!created) {
    return { created: false };
  }

  const limitResult = await checkAndIncrement(deviceId, aiLimitContext);

  if (!limitResult.allowed) {
    await saveAskMessage(id, {
      id,
      status: 'error',
      error: 'Weekly AI limit reached',
      ...aiModelResponseFields(model),
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
    modelLabel?: string;
    answer?: string;
    answerKind?: unknown;
    items?: unknown;
    evidence?: unknown;
    error?: string;
  };
  if (!msg?.id || !msg?.status) return null;

  const enriched = enrichMessageWithModelLabel(msg);
  const modelField =
    typeof enriched.model === 'string' && enriched.model.trim() ? enriched.model.trim() : undefined;
  const modelLabelField =
    typeof enriched.modelLabel === 'string' && enriched.modelLabel.trim()
      ? enriched.modelLabel.trim()
      : undefined;
  const modelFields =
    modelField != null
      ? {
          model: modelField,
          ...(modelLabelField ? { modelLabel: modelLabelField } : {}),
        }
      : {};

  if (msg.status === 'processing') {
    return { id: msg.id, status: 'processing', ...modelFields };
  }
  if (msg.status === 'done' && typeof msg.answer === 'string') {
    const answerKind =
      msg.answerKind === 'plain' ||
      msg.answerKind === 'list' ||
      msg.answerKind === 'tasks' ||
      msg.answerKind === 'decisions'
        ? msg.answerKind
        : undefined;
    const items = Array.isArray(msg.items)
      ? msg.items
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 12)
      : undefined;
    const evidence = Array.isArray(msg.evidence)
      ? msg.evidence
          .map((item): AskEvidenceMessageItem | null => {
            if (!item || typeof item !== 'object') return null;
            const o = item as Record<string, unknown>;
            const quote = typeof o.quote === 'string' ? o.quote.trim() : '';
            if (!quote) return null;
            return {
              quote,
              ...(typeof o.source === 'string'
                ? { source: o.source as AskEvidenceMessageItem['source'] }
                : {}),
              ...(typeof o.offsetMs === 'number' && Number.isFinite(o.offsetMs)
                ? { offsetMs: Math.max(0, Math.round(o.offsetMs)) }
                : o.offsetMs === null
                  ? { offsetMs: null }
                  : {}),
              ...(typeof o.label === 'string' && o.label.trim() ? { label: o.label.trim() } : {}),
            };
          })
          .filter((item): item is AskEvidenceMessageItem => item !== null)
          .slice(0, 5)
      : undefined;
    return {
      id: msg.id,
      status: 'done',
      answer: msg.answer,
      ...(answerKind ? { answerKind } : {}),
      ...(items?.length ? { items } : {}),
      ...(evidence?.length ? { evidence } : {}),
      ...modelFields,
    };
  }
  if (msg.status === 'error' && typeof msg.error === 'string') {
    return {
      id: msg.id,
      status: 'error',
      error: msg.error,
      ...modelFields,
    };
  }

  return null;
};
