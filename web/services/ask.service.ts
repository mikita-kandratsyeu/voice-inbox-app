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
