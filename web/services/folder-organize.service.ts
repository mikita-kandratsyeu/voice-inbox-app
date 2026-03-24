import { after } from 'next/server';

import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import { processAutoOrganizeFolders } from '@/services/ai.service';
import type { AutoOrganizeMessage, AutoOrganizeResult, Message } from '@/types';

type CreateAutoOrganizeResult =
  | { created: true; syncToken?: string }
  | { created: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { created: false };

function saveAutoOrganizeMessage(id: string, data: AutoOrganizeMessage): Promise<void> {
  return saveMessage(id, data as unknown as Message);
}

export const createAutoOrganizeRequest = async (
  id: string,
  notesPayload: string,
  model: string,
  deviceId: string,
): Promise<CreateAutoOrganizeResult> => {
  const created = await saveMessageIfNotExists(id, {
    id,
    status: 'processing',
  } as unknown as Message);
  if (!created) return { created: false };

  const limitResult = await checkAndIncrement(deviceId);
  if (!limitResult.allowed) {
    await saveAutoOrganizeMessage(id, {
      id,
      status: 'error',
      error: 'Weekly AI limit reached',
    });
    return { created: false, limitExceeded: true, usage: limitResult.usage };
  }

  const syncToken = getSyncToken();

  after(async () => {
    try {
      const result = await processAutoOrganizeFolders(notesPayload, model);
      await saveAutoOrganizeMessage(id, {
        id,
        status: 'done',
        result,
      });
    } catch (err) {
      await decrement(deviceId);
      await saveAutoOrganizeMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  return { created: true, syncToken };
};

export const getAutoOrganizeById = async (
  id: string,
  syncToken?: string,
): Promise<AutoOrganizeMessage | null> => {
  const raw = await getMessage(id, syncToken);
  if (!raw) return null;

  const msg = raw as {
    id?: string;
    status?: string;
    result?: AutoOrganizeResult;
    error?: string;
  };

  if (!msg?.id || !msg?.status) return null;
  if (msg.status === 'processing') return { id: msg.id, status: 'processing' };
  if (msg.status === 'error' && typeof msg.error === 'string') {
    return { id: msg.id, status: 'error', error: msg.error };
  }
  if (msg.status === 'done' && msg.result && typeof msg.result === 'object') {
    return { id: msg.id, status: 'done', result: msg.result };
  }

  return null;
};
