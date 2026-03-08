import { getMessage, getSyncToken, saveMessage, saveMessageIfNotExists } from '@/lib/redis';
import { processTranscript } from '@/services/ai.service';
import type { Message } from '@/types';

export async function createMessage(
  id: string,
  transcript: string,
  model: string,
  systemPrompt: string,
): Promise<{ created: boolean; syncToken?: string }> {
  const created = await saveMessageIfNotExists(id, { id, status: 'processing' });
  if (!created) {
    return { created: false };
  }

  const syncToken = getSyncToken();

  processTranscript(transcript, model, systemPrompt)
    .then(async (result) => {
      await saveMessage(id, {
        id,
        status: 'done',
        summary: result.summary,
        tasks: result.tasks,
      });
    })
    .catch(async (err) => {
      await saveMessage(id, {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

  return { created: true, syncToken };
}

export async function getMessageById(id: string, syncToken?: string): Promise<Message | null> {
  return getMessage(id, syncToken);
}
