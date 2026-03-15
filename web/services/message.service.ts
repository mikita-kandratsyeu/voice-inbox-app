import { after } from 'next/server';
import { sendPushNotification } from '@/lib/push';
import {
  collectPendingAndUnlock,
  getPushTokenWithLocale,
  isAppInForeground,
  registerAiCompletion,
} from '@/lib/push-tokens';
import { PUSH_DEBOUNCE_MS } from '@/config/constants';
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

  after(async () => {
    try {
      const result = await processTranscript(transcript, model, systemPrompt);
      await saveMessage(id, {
        id,
        status: 'done',
        summary: result.summary,
        suggestedTitle: result.suggestedTitle,
        tasks: result.tasks,
        tags: result.tags,
        ...(result.classification && { classification: result.classification }),
        ...(result.keyPhrases &&
          result.keyPhrases.length > 0 && {
            keyPhrases: result.keyPhrases,
          }),
        ...(result.nextSteps && result.nextSteps.length > 0 && { nextSteps: result.nextSteps }),
      });

      const inForeground = await isAppInForeground(deviceId);
      if (inForeground) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Push] AI complete: skip (app in foreground)', { deviceId });
        }
        return;
      }

      // Register completion. Only the first caller (leader) waits and sends the push.
      const isLeader = await registerAiCompletion(deviceId);
      if (!isLeader) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Push] AI complete: queued (leader will send)', { deviceId });
        }
        return;
      }

      // Leader waits for debounce window to collect all parallel completions
      await new Promise((resolve) => setTimeout(resolve, PUSH_DEBOUNCE_MS));

      const count = await collectPendingAndUnlock(deviceId);
      if (count === 0) return;

      const data = await getPushTokenWithLocale(deviceId);
      if (data) {
        const sent = await sendPushNotification(
          data.token,
          { type: 'ai_complete', recordId: id },
          data.locale,
          count,
        );
        console.log('[Push] AI complete:', sent ? 'sent' : 'failed', { deviceId, count });
      } else {
        console.warn('[Push] AI complete: no token for deviceId', deviceId);
      }
    } catch (err) {
      await decrement(deviceId);
      await saveMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  return { created: true, syncToken };
};

export const getMessageById = async (id: string, syncToken?: string): Promise<Message | null> =>
  getMessage(id, syncToken);
