import { openRouterClient } from '@/lib/openrouter';
import type { AiResult, RecordClassification } from '@/types';
import {
  ServiceUnavailableResponseError,
  TooManyRequestsResponseError,
} from '@openrouter/sdk/models/errors';

import { FALLBACK_MODEL } from '@/config/constants';
import { ASK_QUESTION_SYSTEM_PROMPT } from '@/lib/prompts';

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

  const rawTags = 'tags' in parsed && Array.isArray(parsed.tags) ? parsed.tags : [];
  const tags = rawTags
    .filter((tag: unknown) => typeof tag === 'string')
    .map((tag: string) => tag.trim().toLowerCase())
    .filter(Boolean) as string[];

  const validClassifications: RecordClassification[] = [
    'personal',
    'work',
    'meeting',
    'idea',
    'other',
  ];
  const rawClassification = 'classification' in parsed ? parsed.classification : undefined;
  const classification: RecordClassification | undefined =
    typeof rawClassification === 'string' &&
    validClassifications.includes(rawClassification as RecordClassification)
      ? (rawClassification as RecordClassification)
      : undefined;

  const rawKeyPhrases =
    'keyPhrases' in parsed && Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : [];
  const keyPhrases = rawKeyPhrases
    .filter((p: unknown) => typeof p === 'string')
    .map((p: string) => p.trim())
    .filter(Boolean) as string[];

  const rawNextSteps =
    'nextSteps' in parsed && Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [];
  const nextSteps = rawNextSteps
    .filter((s: unknown) => typeof s === 'string')
    .map((s: string) => s.trim())
    .filter(Boolean) as string[];

  const suggestedTitle =
    'suggestedTitle' in parsed && typeof parsed.suggestedTitle === 'string'
      ? String(parsed.suggestedTitle).trim()
      : '';

  return {
    summary: String(parsed.summary),
    suggestedTitle: suggestedTitle || String(parsed.summary).slice(0, 50).trim() || 'Voice note',
    tasks,
    tags,
    ...(classification && { classification }),
    ...(keyPhrases.length > 0 && { keyPhrases }),
    ...(nextSteps.length > 0 && { nextSteps }),
  };
}

function extractAnswerFromResponse(responseContent: string): string {
  const trimmed = responseContent.trim();
  if (!trimmed) {
    throw new Error('Invalid AI response: empty content');
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const knownKeys = ['answer', 'response', 'text', 'content', 'result'];
        for (const key of knownKeys) {
          const val = obj[key];
          if (typeof val === 'string' && val.length > 0) return val;
        }
        const firstString = Object.values(obj).find((v) => typeof v === 'string' && v.length > 0);
        if (typeof firstString === 'string') return firstString;
      }
    } catch {
      console.warn('Invalid AI response: JSON parse failed', responseContent);

      return trimmed;
    }
  }

  return trimmed;
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

export async function processAskQuestion(
  transcript: string,
  question: string,
  model: string,
  summary?: string,
  tasks?: { text: string }[],
): Promise<{ answer: string }> {
  const parts: string[] = ['Transcript:\n\n', transcript];
  if (summary && summary.trim()) {
    parts.push('\n\nSummary:\n\n', summary.trim());
  }
  if (tasks && tasks.length > 0) {
    const taskLines = tasks.map((t) => `- ${t.text}`).join('\n');
    parts.push('\n\nTasks:\n\n', taskLines);
  }
  parts.push('\n\nQuestion: ', question);
  const userContent = parts.join('');

  const callAsk = async (
    content: string,
    m: string,
    sysPrompt: string,
  ): Promise<{ answer: string }> => {
    const response = await openRouterClient.chat.send({
      chatGenerationParams: {
        model: m,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content },
        ],
        provider: { zdr: true },
        responseFormat: { type: 'json_object' },
        temperature: 0.3,
        stream: false,
      },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (typeof responseContent !== 'string') {
      throw new Error('Invalid AI response: missing content');
    }

    const answer = extractAnswerFromResponse(responseContent);
    return { answer };
  };

  try {
    return await callAsk(userContent, model, ASK_QUESTION_SYSTEM_PROMPT);
  } catch (err) {
    const isRetryable =
      err instanceof TooManyRequestsResponseError || err instanceof ServiceUnavailableResponseError;
    if (isRetryable) {
      return await callAsk(userContent, FALLBACK_MODEL, ASK_QUESTION_SYSTEM_PROMPT);
    }
    throw err;
  }
}
