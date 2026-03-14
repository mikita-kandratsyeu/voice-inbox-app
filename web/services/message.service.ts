import { sendPushNotification } from '@/lib/apns';
import { getPushToken } from '@/lib/push-tokens';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import { processTranscript } from '@/services/ai.service';
import type { Message } from '@/types';

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
): Promise<CreateMessageResult> => {
  const created = await saveMessageIfNotExists(id, { id, status: 'processing' });
  if (!created) {
    return { created: false };
  }

  const limitResult = await checkAndIncrement(deviceId);
  if (!limitResult.allowed) {
    await saveMessage(id, {
      id,
      status: 'error',
      error: 'Weekly AI limit reached',
    });

    return { created: false, limitExceeded: true, usage: limitResult.usage };
  }

  const syncToken = getSyncToken();

  processTranscript(transcript, model, systemPrompt)
    .then(async (result) => {
      await saveMessage(id, {
        id,
        status: 'done',
        summary: result.summary,
        tasks: result.tasks,
        tags: result.tags,
        ...(result.classification && { classification: result.classification }),
        ...(result.keyPhrases && result.keyPhrases.length > 0 && {
          keyPhrases: result.keyPhrases,
        }),
        ...(result.nextSteps && result.nextSteps.length > 0 && { nextSteps: result.nextSteps }),
      });

      const token = await getPushToken(deviceId);
      if (token) {
        await sendPushNotification(token, { type: 'ai_complete', recordId: id });
      }
    })
    .catch(async (err) => {
      await decrement(deviceId);
      await saveMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

  return { created: true, syncToken };
};

export const getMessageById = async (id: string, syncToken?: string): Promise<Message | null> =>
  getMessage(id, syncToken);
