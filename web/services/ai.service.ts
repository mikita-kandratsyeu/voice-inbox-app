import { openRouterClient } from '@/lib/openrouter';
import type { AiResult } from '@/types';
import {
  ServiceUnavailableResponseError,
  TooManyRequestsResponseError,
} from '@openrouter/sdk/models/errors';

import { FALLBACK_MODEL } from '@/config/constants';

async function callOpenRouter(
  transcript: string,
  model: string,
  systemPrompt: string,
): Promise<AiResult> {
  const response = await openRouterClient.chat.send({
    chatGenerationParams: {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      provider: { zdr: true },
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
      stream: false,
    },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Invalid AI response: missing content');
  }

  const parsed = JSON.parse(content) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('summary' in parsed) ||
    !('tasks' in parsed) ||
    !Array.isArray(parsed.tasks)
  ) {
    throw new Error('Invalid AI response: unexpected structure');
  }

  const tasks = parsed.tasks.map((t: unknown) => {
    if (
      !t ||
      typeof t !== 'object' ||
      !('title' in t) ||
      !('priority' in t) ||
      typeof (t as { title: unknown }).title !== 'string' ||
      !['high', 'medium', 'low'].includes((t as { priority: unknown }).priority as string)
    ) {
      throw new Error('Invalid AI response: invalid task structure');
    }
    const task = t as { title: string; priority: string; deadline?: string | null };
    return {
      title: task.title,
      priority: task.priority as 'high' | 'medium' | 'low',
      deadline: task.deadline ?? null,
    };
  });

  return {
    summary: String(parsed.summary),
    tasks,
  };
}

export async function processTranscript(
  transcript: string,
  model: string,
  systemPrompt: string,
): Promise<AiResult> {
  try {
    return await callOpenRouter(transcript, model, systemPrompt);
  } catch (err) {
    const isRetryable =
      err instanceof TooManyRequestsResponseError || err instanceof ServiceUnavailableResponseError;
    if (isRetryable) {
      return await callOpenRouter(transcript, FALLBACK_MODEL, systemPrompt);
    }
    throw err;
  }
}
