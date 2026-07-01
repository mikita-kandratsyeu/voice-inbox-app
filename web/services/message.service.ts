import { sendLimitExceededPush } from '@/lib/push-tokens';
import { MESSAGE_TTL_SECONDS } from '@/config/constants';
import { checkAndIncrement, type AiLimitContext } from '@/lib/ai-rate-limit';
import { resolveTranscriptSummarizeLedgerOperation } from '@/lib/ai-usage-ledger';
import { clearAiJobCancelled } from '@/lib/ai-job-cancel';
import type { AiModelMode } from '@/lib/ai-model-router';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveJobPayload } from '@/lib/ai-job-payload';
import { releaseJobLock } from '@/lib/ai-job-lock';
import { dispatchMeetingDialogueJob } from '@/lib/meeting-dialogue-dispatch';
import {
  aiModelLedgerMetadata,
  aiModelResponseFields,
  enrichMessageWithModelLabel,
  sanitizeAiModelFieldsForClient,
} from '@/lib/ai-model-display';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import { saveJobMetadata, getJobMetadata } from '@/lib/job-metadata';
import { calculatePollDeadlineMs } from '@/lib/ai-job-duration';
import { enrichWithPollingHints, operationToJobType } from '@/lib/polling-hints';
import type {
  MeetingDialogueAuxPayload,
  MeetingDialogueJobPayload,
  SummarizeJobPayload,
} from '@/types/ai-job';
import type { Message } from '@/types';

export type { MeetingDialogueAuxPayload } from '@/types/ai-job';

type CreateMessageResult =
  | { created: true; syncToken?: string }
  | { created: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { created: false };

export const createMessage = async (
  id: string,
  transcript: string,
  model: string,
  systemPrompt: string,
  deviceId: string,
  clientUserAgent?: string | null,
  messageTtlSeconds: number = MESSAGE_TTL_SECONDS,
  pseudoDiarizationEligible: boolean = false,
  meetingDialogueSystemPrompt?: string,
  meetingDialogueAux?: MeetingDialogueAuxPayload,
  aiLimitContext?: AiLimitContext,
  modelMode?: AiModelMode,
): Promise<CreateMessageResult> => {
  const ttl = messageTtlSeconds;
  const chargedUsageUnits =
    pseudoDiarizationEligible && meetingDialogueSystemPrompt?.trim() ? 2 : 1;
  const summarizeLedgerOperation = resolveTranscriptSummarizeLedgerOperation(chargedUsageUnits);
  const created = await saveMessageIfNotExists(
    id,
    {
      id,
      status: 'processing',
      ...aiModelResponseFields(model),
      ...(modelMode ? { modelMode } : {}),
    },
    ttl,
  );
  if (!created) {
    return { created: false };
  }

  const limitResult = await checkAndIncrement(deviceId, aiLimitContext, chargedUsageUnits, {
    operation: summarizeLedgerOperation,
    jobId: id,
    metadata: { ...aiModelLedgerMetadata(model, modelMode), chargedUsageUnits },
  });
  if (!limitResult.allowed) {
    await saveMessage(
      id,
      {
        id,
        status: 'error',
        error: 'Weekly AI limit reached',
        ...aiModelResponseFields(model),
      },
      ttl,
    );
    await sendLimitExceededPush(deviceId);

    return { created: false, limitExceeded: true, usage: limitResult.usage };
  }

  const syncToken = getSyncToken();

  const jobPayload: SummarizeJobPayload = {
    operation: 'transcript_summarize',
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    model,
    systemPrompt,
    clientUserAgent,
    pseudoDiarizationEligible,
    meetingDialogueSystemPrompt,
    meetingDialogueAux,
    chargedUsageUnits,
    ...(modelMode ? { modelMode } : {}),
  };

  await saveJobPayload(jobPayload);

  // Save job metadata for polling hints calculation
  const operation = jobPayload.operation; // 'transcript_summarize'
  const jobType = operationToJobType(operation);
  await saveJobMetadata(id, jobType, deviceId, ttl);

  await dispatchAiJob(jobPayload);

  return { created: true, syncToken };
};

export const getMessageById = async (id: string, syncToken?: string): Promise<Message | null> => {
  const message = await getMessage(id, syncToken);

  if (!message) {
    return null;
  }

  // Enrich with model label
  const enriched = enrichMessageWithModelLabel(message);

  if (enriched.status === 'done' && enriched.meetingDialogueStatus === 'processing') {
    const metadata = await getJobMetadata(id);
    const startedAt = metadata?.startedAt ?? Date.now();
    return sanitizeAiModelFieldsForClient({
      ...enriched,
      pollDeadlineMs: calculatePollDeadlineMs(startedAt, 'summary'),
    });
  }

  // Add adaptive polling hints for processing messages
  if (enriched.status === 'processing') {
    const metadata = await getJobMetadata(id);

    if (metadata) {
      return sanitizeAiModelFieldsForClient(
        enrichWithPollingHints(enriched, metadata.jobType, metadata.startedAt),
      );
    }
  }

  return sanitizeAiModelFieldsForClient(enriched);
};

type RetryMeetingDialogueResult =
  | { ok: true; syncToken?: string }
  | { ok: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { ok: false; error: string };

export type MeetingDialogueRehydratePhase1 = {
  suggestedTitle: string;
  summary: string;
  keyPhrases?: string[];
};

export const retryMeetingDialogue = async (params: {
  jobId: string;
  deviceId: string;
  transcript: string;
  model: string;
  meetingDialogueSystemPrompt: string;
  meetingDialogueAux?: MeetingDialogueAuxPayload;
  clientUserAgent?: string | null;
  messageTtlSeconds?: number;
  /** Local summarize result when Redis KV for the original job has expired. */
  rehydratePhase1?: MeetingDialogueRehydratePhase1;
}): Promise<RetryMeetingDialogueResult> => {
  const ttl = params.messageTtlSeconds ?? MESSAGE_TTL_SECONDS;
  const existing = await getMessage(params.jobId);

  let done: Extract<Message, { status: 'done' }>;

  if (existing?.status === 'done') {
    done = existing;
  } else {
    const p1 = params.rehydratePhase1;
    const summary = p1?.summary?.trim() ?? '';
    if (!summary || !p1) {
      return { ok: false, error: 'Summarize job not complete' };
    }
    done = {
      id: params.jobId,
      status: 'done',
      model: params.model,
      summary,
      suggestedTitle: p1.suggestedTitle?.trim() || 'Meeting',
      tasks: [],
      tags: [],
      ...(p1.keyPhrases?.length ? { keyPhrases: p1.keyPhrases } : {}),
    };
  }

  if (done.meetingDialogueStatus === 'processing') {
    return { ok: false, error: 'Meeting dialogue already processing' };
  }

  const limitResult = await checkAndIncrement(params.deviceId, undefined, 1, {
    operation: 'meeting_dialogue',
    jobId: params.jobId,
    metadata: aiModelResponseFields(params.model),
  });
  if (!limitResult.allowed) {
    await sendLimitExceededPush(params.deviceId);
    return { ok: false, limitExceeded: true, usage: limitResult.usage };
  }

  await clearAiJobCancelled(params.jobId);
  await releaseJobLock(params.jobId);

  const processingState = { ...done, meetingDialogueStatus: 'processing' as const };
  delete processingState.meetingDialogueMarkdown;
  await saveMessage(params.jobId, processingState, ttl);

  const meetingPayload: MeetingDialogueJobPayload = {
    operation: 'meeting_dialogue',
    jobId: params.jobId,
    deviceId: params.deviceId,
    messageTtlSeconds: ttl,
    transcript: params.transcript,
    model: params.model,
    meetingDialogueSystemPrompt: params.meetingDialogueSystemPrompt,
    meetingDialogueAux: params.meetingDialogueAux,
    phase1: {
      suggestedTitle: done.suggestedTitle,
      keyPhrases: done.keyPhrases,
      summary: done.summary,
    },
    clientUserAgent: params.clientUserAgent,
    retryNonce: String(Date.now()),
  };

  await dispatchMeetingDialogueJob(meetingPayload);

  return { ok: true, syncToken: getSyncToken() };
};
