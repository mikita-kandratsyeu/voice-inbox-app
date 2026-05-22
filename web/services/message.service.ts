import { sendLimitExceededPush } from '@/lib/push-tokens';
import { MESSAGE_TTL_SECONDS } from '@/config/constants';
import { checkAndIncrement } from '@/lib/ai-rate-limit';
import { dispatchAiJob } from '@/lib/ai-job-dispatch';
import { saveJobPayload } from '@/lib/ai-job-payload';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import type { MeetingDialogueAuxPayload, SummarizeJobPayload } from '@/types/ai-job';
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
): Promise<CreateMessageResult> => {
  const ttl = messageTtlSeconds;
  const created = await saveMessageIfNotExists(id, { id, status: 'processing', model }, ttl);
  if (!created) {
    return { created: false };
  }

  const limitResult = await checkAndIncrement(deviceId);
  if (!limitResult.allowed) {
    await saveMessage(
      id,
      {
        id,
        status: 'error',
        error: 'Weekly AI limit reached',
        model,
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
  };

  await saveJobPayload(jobPayload);
  await dispatchAiJob(jobPayload);

  return { created: true, syncToken };
};

export const getMessageById = async (id: string, syncToken?: string): Promise<Message | null> =>
  getMessage(id, syncToken);
