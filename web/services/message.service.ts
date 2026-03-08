import { getMessage, saveMessage } from '@/lib/redis';
import { processTranscript } from '@/services/ai.service';
import type { Message } from '@/types';

export async function createMessage(
  id: string,
  transcript: string,
  model: string,
  systemPrompt: string,
): Promise<void> {
  await saveMessage(id, { id, status: 'processing' });

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
}

export async function getMessageById(id: string): Promise<Message | null> {
  return getMessage(id);
}
