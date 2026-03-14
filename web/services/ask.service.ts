import { sendPushNotification } from '@/lib/apns';
import {
  collectPendingAndUnlock,
  getPushTokenWithLocale,
  isAppInForeground,
  registerAiCompletion,
} from '@/lib/push-tokens';
import { PUSH_DEBOUNCE_MS } from '@/config/constants';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import { processAskQuestion } from '@/services/ai.service';
import type { AskMessage, Message } from '@/types';

type CreateAskResult =
  | { created: true; syncToken?: string }
  | { created: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { created: false };

function saveAskMessage(id: string, data: AskMessage): Promise<void> {
  return saveMessage(id, data as unknown as Message);
}

export const createAsk = async (
  id: string,
  transcript: string,
  question: string,
  model: string,
  deviceId: string,
): Promise<CreateAskResult> => {
  const created = await saveMessageIfNotExists(id, {
    id,
    status: 'processing',
  } as unknown as Message);

  if (!created) {
    return { created: false };
  }

  const limitResult = await checkAndIncrement(deviceId);
  if (!limitResult.allowed) {
    await saveAskMessage(id, {
      id,
      status: 'error',
      error: 'Weekly AI limit reached',
    });

    return { created: false, limitExceeded: true, usage: limitResult.usage };
  }

  const syncToken = getSyncToken();

  processAskQuestion(transcript, question, model)
    .then(async (result) => {
      await saveAskMessage(id, {
        id,
        status: 'done',
        answer: result.answer,
      });

      const inForeground = await isAppInForeground(deviceId);
      if (inForeground) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Push] Ask complete: skip (app in foreground)', { deviceId });
        }
        return;
      }

      const isLeader = await registerAiCompletion(deviceId);
      if (!isLeader) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Push] Ask complete: queued (leader will send)', { deviceId });
        }
        return;
      }

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
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Push] Ask complete: push', sent ? 'sent' : 'failed', { deviceId, count });
        }
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn('[Push] Ask complete: no token for deviceId', deviceId);
      }
    })
    .catch(async (err) => {
      await decrement(deviceId);
      await saveAskMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

  return { created: true, syncToken };
};

export const getAskById = async (id: string, syncToken?: string): Promise<AskMessage | null> => {
  const raw = await getMessage(id, syncToken);
  if (!raw) return null;

  const msg = raw as { id?: string; status?: string; answer?: string; error?: string };
  if (!msg?.id || !msg?.status) return null;

  if (msg.status === 'processing') {
    return { id: msg.id, status: 'processing' };
  }
  if (msg.status === 'done' && typeof msg.answer === 'string') {
    return { id: msg.id, status: 'done', answer: msg.answer };
  }
  if (msg.status === 'error' && typeof msg.error === 'string') {
    return { id: msg.id, status: 'error', error: msg.error };
  }

  return null;
};
