import { sendLimitExceededPush } from '@/lib/push-tokens';
import { MESSAGE_TTL_SECONDS } from '@/config/constants';
import { checkAndIncrement, type AiLimitContext } from '@/lib/ai-rate-limit';
import type { AiModelMode } from '@/lib/ai-model-router';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { getJobPayload, saveJobPayload } from '@/lib/ai-job-payload';
import { scheduleAsyncJobPoll } from '@/lib/ai-job-poll-schedule';
import { buildAsyncJobPollSchedule } from '@/lib/ai-poll-deadline';
import { getJobMetadata } from '@/lib/job-metadata';
import { enrichWithPollingHints, operationToJobType } from '@/lib/polling-hints';
import {
  aiModelLedgerMetadata,
  aiModelResponseFields,
  enrichMessageWithModelLabel,
  sanitizeAiModelFieldsForClient,
} from '@/lib/ai-model-display';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import type { CorpusNoteForPrompt } from '@/lib/corpus-notes-prompt';
import { parseStoredInboxAskToolCall, validateInboxAskToolResult } from '@/lib/inbox-ask-tools';
import type { InboxAskJobPayload } from '@/types/ai-job';
import type { AskMessage, Message } from '@/types';

type CreateInboxAskResult =
  | { created: true; syncToken?: string; pollExpiresAt: string }
  | { created: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { created: false };

export const createInboxAsk = async (
  id: string,
  corpusNotes: CorpusNoteForPrompt[],
  question: string,
  model: string,
  deviceId: string,
  priorTurns?: { question: string; answer: string }[],
  clientUserAgent?: string | null,
  messageTtlSeconds: number = MESSAGE_TTL_SECONDS,
  aiLimitContext?: AiLimitContext,
  modelMode?: AiModelMode,
): Promise<CreateInboxAskResult> => {
  const ttl = messageTtlSeconds;

  const saveAskMessage = (msgId: string, data: AskMessage) =>
    saveMessage(msgId, data as unknown as Message, ttl);

  const created = await saveMessageIfNotExists(
    id,
    {
      id,
      status: 'processing',
      ...aiModelResponseFields(model),
      ...(modelMode ? { modelMode } : {}),
    } as unknown as Message,
    ttl,
  );

  if (!created) {
    return { created: false };
  }

  const limitResult = await checkAndIncrement(deviceId, aiLimitContext, 1, {
    operation: 'inbox_ask',
    jobId: id,
    metadata: aiModelLedgerMetadata(model, modelMode),
  });

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

  const jobPayload: InboxAskJobPayload = {
    operation: 'inbox_ask',
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    corpusNotes,
    question,
    model,
    priorTurns,
    clientUserAgent,
    ...(modelMode ? { modelMode } : {}),
  };

  await saveJobPayload(jobPayload);

  const operation = jobPayload.operation;
  const jobType = operationToJobType(operation);
  const pollSchedule = await scheduleAsyncJobPoll({
    jobId: id,
    jobType,
    deviceId,
    ttlSeconds: ttl,
  });

  await dispatchAiJob(jobPayload);

  return { created: true, syncToken, pollExpiresAt: pollSchedule.pollExpiresAt };
};

export const getInboxAskById = async (
  id: string,
  syncToken?: string,
): Promise<AskMessage | null> => {
  const raw = await getMessage(id, syncToken);
  if (!raw) return null;

  const msg = raw as {
    id?: string;
    status?: string;
    model?: string;
    modelLabel?: string;
    modelMode?: 'manual' | 'auto';
    answer?: string;
    answerKind?: unknown;
    items?: unknown;
    suggestedFollowUps?: unknown;
    interpretations?: unknown;
    evidence?: unknown;
    error?: string;
    toolCall?: unknown;
    toolSteps?: unknown;
  };
  if (!msg?.id || !msg?.status) return null;

  const enriched = enrichMessageWithModelLabel(msg);
  const modelMode =
    enriched.modelMode === 'auto' || enriched.modelMode === 'manual'
      ? enriched.modelMode
      : undefined;
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
          ...(modelMode ? { modelMode } : {}),
        }
      : modelMode
        ? { modelMode }
        : {};

  if (msg.status === 'processing') {
    const base = { id: msg.id, status: 'processing', ...modelFields } as const;
    const metadata = await getJobMetadata(msg.id);
    if (metadata) {
      return sanitizeAiModelFieldsForClient(
        enrichWithPollingHints(
          base,
          metadata.jobType,
          metadata.startedAt,
          metadata.pollExpiresAtMs,
        ) as AskMessage,
      );
    }
    return sanitizeAiModelFieldsForClient(base as AskMessage);
  }
  if (msg.status === 'needs_tool') {
    const toolCall = parseStoredInboxAskToolCall(msg.toolCall);
    if (!toolCall) return null;
    return sanitizeAiModelFieldsForClient({
      id: msg.id,
      status: 'needs_tool',
      ...modelFields,
      toolCall,
      ...(Array.isArray(msg.toolSteps) ? { toolSteps: msg.toolSteps } : {}),
    } as AskMessage);
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
          .slice(0, 20)
      : undefined;
    const suggestedFollowUps = Array.isArray(msg.suggestedFollowUps)
      ? msg.suggestedFollowUps
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 5)
      : undefined;
    const interpretations = Array.isArray(msg.interpretations)
      ? msg.interpretations
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 5)
      : undefined;

    return sanitizeAiModelFieldsForClient({
      id: msg.id,
      status: 'done',
      ...modelFields,
      answer: msg.answer,
      ...(answerKind ? { answerKind } : {}),
      ...(items?.length ? { items } : {}),
      ...(suggestedFollowUps?.length ? { suggestedFollowUps } : {}),
      ...(interpretations?.length ? { interpretations } : {}),
      ...(Array.isArray(msg.toolSteps) && msg.toolSteps.length > 0
        ? { toolSteps: msg.toolSteps }
        : {}),
      ...(Array.isArray(msg.evidence) && msg.evidence.length > 0 ? { evidence: msg.evidence } : {}),
    } as AskMessage);
  }
  if (msg.status === 'error') {
    return sanitizeAiModelFieldsForClient({
      id: msg.id,
      status: 'error',
      error: typeof msg.error === 'string' ? msg.error : 'Unknown error',
      ...modelFields,
    } as AskMessage);
  }

  return null;
};

export async function submitInboxAskToolResult(
  id: string,
  deviceId: string,
  result: import('@/lib/inbox-ask-tools').InboxAskToolResult,
): Promise<
  | { ok: true; syncToken?: string; pollExpiresAt: string }
  | { ok: false; error: string; status: number }
> {
  if (!validateInboxAskToolResult(result)) {
    return { ok: false, error: 'Invalid tool result', status: 400 };
  }

  const payload = await getJobPayload(id);
  if (!payload || payload.operation !== 'inbox_ask') {
    return { ok: false, error: 'Not found', status: 404 };
  }
  if (payload.deviceId !== deviceId) {
    return { ok: false, error: 'Forbidden', status: 403 };
  }

  const pending = payload.pendingToolCall;
  if (!pending) {
    const alreadyApplied = payload.toolResults?.some(
      (item) => item.toolCallId === result.toolCallId,
    );
    if (alreadyApplied) {
      const metadata = await getJobMetadata(id);
      const pollExpiresAt =
        metadata?.pollExpiresAtMs != null
          ? new Date(metadata.pollExpiresAtMs).toISOString()
          : buildAsyncJobPollSchedule({}).pollExpiresAt;
      return { ok: true, syncToken: getSyncToken(), pollExpiresAt };
    }
    return { ok: false, error: 'No pending tool call', status: 409 };
  }

  if (
    pending.toolCallId !== result.toolCallId ||
    pending.toolName !== result.toolName ||
    pending.round !== result.round
  ) {
    return { ok: false, error: 'Tool result does not match pending call', status: 409 };
  }

  if (Date.parse(pending.expiresAt) < Date.now()) {
    return { ok: false, error: 'Tool call expired', status: 410 };
  }

  const toolMessages = [
    ...(payload.toolMessages ?? []),
    {
      role: 'tool' as const,
      tool_call_id: result.toolCallId,
      content: JSON.stringify(result.result),
    },
  ];
  const toolSteps = (payload.toolSteps ?? []).map((step) =>
    step.toolCallId === result.toolCallId ? { ...step, status: 'completed' as const } : step,
  );
  const nextPayload: InboxAskJobPayload = {
    ...payload,
    toolResults: [...(payload.toolResults ?? []), result],
    toolMessages,
    toolSteps,
  };
  delete nextPayload.pendingToolCall;

  await saveJobPayload(nextPayload);
  await saveMessage(
    id,
    {
      id,
      status: 'processing',
      ...aiModelResponseFields(payload.model),
      ...(payload.modelMode ? { modelMode: payload.modelMode } : {}),
    } as unknown as Message,
    payload.messageTtlSeconds,
  );
  await dispatchAiJob(nextPayload, { deduplicationId: `${id}-tool-${result.toolCallId}` });

  const pollSchedule = await scheduleAsyncJobPoll({
    jobId: id,
    jobType: 'ask',
    deviceId,
    ttlSeconds: payload.messageTtlSeconds,
  });

  return { ok: true, syncToken: getSyncToken(), pollExpiresAt: pollSchedule.pollExpiresAt };
}
