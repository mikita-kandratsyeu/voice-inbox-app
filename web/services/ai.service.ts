import { openRouterClient } from '@/lib/openrouter';
import {
  isRetryableOpenRouterTransportError,
  withSequentialModelFallback,
} from '@/lib/ai-model-fallback';
import { normalizeAutoOrganizeFolderColor } from '@/lib/folder-accent-colors';
import { ASK_QUESTION_SYSTEM_PROMPT, AUTO_ORGANIZE_FOLDERS_SYSTEM_PROMPT } from '@/lib/prompts';
import type { AiResult, AutoOrganizeResult, RecordClassification } from '@/types';

import { SYSTEM_TASK_MODEL_FALLBACK_CHAIN, USER_AI_MODEL_FALLBACK_CHAIN } from '@/config/constants';

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
  const models = [model, ...USER_AI_MODEL_FALLBACK_CHAIN];

  return withSequentialModelFallback(
    models,
    (m) => callOpenRouter(transcript, m, systemPrompt),
    isRetryableOpenRouterTransportError,
  );
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

  const models = [model, ...USER_AI_MODEL_FALLBACK_CHAIN];

  return withSequentialModelFallback(
    models,
    (m) => callAsk(userContent, m, ASK_QUESTION_SYSTEM_PROMPT),
    isRetryableOpenRouterTransportError,
  );
}

const ALLOWED_FOLDER_ICONS = new Set([
  'briefcase',
  'home',
  'lightbulb',
  'music',
  'star',
  'heart',
  'plane',
  'rocket',
  'palette',
  'flame',
  'globe',
  'graduation',
]);

const DEFAULT_AUTO_FOLDER_ICON = 'briefcase';

function parseAutoOrganizeResult(rawContent: string): AutoOrganizeResult {
  const trimmed = rawContent.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const objectSlice = (() => {
    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return withoutFences;
    return withoutFences.slice(start, end + 1);
  })();

  let parsed: unknown;
  try {
    parsed = JSON.parse(objectSlice);
  } catch {
    throw new Error('Invalid AI response: malformed JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response: expected object');
  }

  const obj = parsed as {
    folders?: Array<{ name?: unknown; icon?: unknown; color?: unknown }>;
    assignments?: Array<{ recordId?: unknown; folderName?: unknown }>;
  };

  if (!Array.isArray(obj.folders) || !Array.isArray(obj.assignments)) {
    throw new Error('Invalid AI response: missing folders or assignments');
  }

  const folders = obj.folders
    .map((f) => ({
      name: typeof f?.name === 'string' ? f.name.trim() : '',
      icon:
        typeof f?.icon === 'string' && ALLOWED_FOLDER_ICONS.has(f.icon.trim())
          ? f.icon.trim()
          : DEFAULT_AUTO_FOLDER_ICON,
      color: normalizeAutoOrganizeFolderColor(
        typeof f?.color === 'string' ? f.color : '',
      ).toLowerCase(),
    }))
    .filter((f) => Boolean(f.name));

  if (folders.length === 0) {
    throw new Error('Invalid AI response: no valid folders');
  }

  const folderNameSet = new Set(folders.map((f) => f.name.toLowerCase()));
  const assignments = obj.assignments
    .map((a) => ({
      recordId: typeof a?.recordId === 'string' ? a.recordId.trim() : '',
      folderName: typeof a?.folderName === 'string' ? a.folderName.trim() : '',
    }))
    .filter((a) => Boolean(a.recordId) && folderNameSet.has(a.folderName.toLowerCase()));

  if (assignments.length === 0) {
    throw new Error('Invalid AI response: no valid assignments');
  }

  return { folders, assignments };
}

function isAutoOrganizeParseFailure(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes('Invalid AI response') || err.message.includes('malformed JSON'))
  );
}

export async function processAutoOrganizeFolders(
  notesJsonPayload: string,
  model: string,
): Promise<AutoOrganizeResult> {
  const callOrganize = async (m: string): Promise<AutoOrganizeResult> => {
    const response = await openRouterClient.chat.send({
      chatGenerationParams: {
        model: m,
        messages: [
          { role: 'system', content: AUTO_ORGANIZE_FOLDERS_SYSTEM_PROMPT },
          { role: 'user', content: notesJsonPayload },
        ],
        provider: { zdr: true },
        responseFormat: { type: 'json_object' },
        temperature: 0.2,
        stream: false,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid AI response: missing content');
    }

    return parseAutoOrganizeResult(content);
  };

  const models = [model, ...SYSTEM_TASK_MODEL_FALLBACK_CHAIN];
  return withSequentialModelFallback(
    models,
    callOrganize,
    (err) => isRetryableOpenRouterTransportError(err) || isAutoOrganizeParseFailure(err),
  );
}
