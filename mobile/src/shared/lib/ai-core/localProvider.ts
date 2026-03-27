import { i18n } from '@/shared/lib';
import type { AiTask } from '@/shared/lib/ai-api';

import { completeLocalChat } from './localLlmSession';
import type {
  AiExecutionContext,
  AskRequest,
  AskTaskResult,
  SummaryTaskRequest,
  SummaryTaskResult,
} from './types';

const SAFE_LOCAL_SUMMARY_CHARS = 6000;

function getMaxTranscriptChars(tier: AiExecutionContext['privateCapabilityTier']): number {
  if (tier === 'limited' || tier === 'unavailable') return 5000;
  return 14000;
}

function normalizePriority(value: string): AiTask['priority'] {
  if (value === 'high' || value === 'low') return value;
  return 'medium';
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim());
}

function safeTasks(value: unknown): AiTask[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const v = item as { title?: unknown; priority?: unknown; deadline?: unknown };
      const title = typeof v.title === 'string' ? v.title.trim() : '';
      if (!title) return null;
      const priority = typeof v.priority === 'string' ? normalizePriority(v.priority) : 'medium';
      const deadline = typeof v.deadline === 'string' ? v.deadline : null;
      return { title, priority, deadline };
    })
    .filter((item): item is AiTask => item !== null);
}

async function generateWithLocalLlm(
  modelId: AiExecutionContext['selectedLocalAiModel'],
  messages: { role: 'system' | 'user'; content: string }[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  return completeLocalChat(
    modelId,
    messages.map((m) => ({ role: m.role, content: m.content })),
    {
      maxTokens: options?.maxTokens ?? 512,
      temperature: options?.temperature ?? 0.2,
    },
  );
}

function mapLocalError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const normalized = message.toLowerCase();

  if (message.includes('privateModeModelNotDownloaded')) {
    return i18n.t('ai.privateModeModelNotDownloaded');
  }

  if (
    message.includes('Local LLM model file missing') ||
    normalized.includes('model file missing')
  ) {
    return i18n.t('ai.privateModeModelNotDownloaded');
  }

  if (
    message.includes('Invalid local summary response') ||
    message.includes('Local summary is empty')
  ) {
    return i18n.t('ai.privateModeParseFailed');
  }

  if (message.includes('Local answer is empty')) {
    return i18n.t('ai.privateModeEmptyAnswer');
  }

  if (message.includes('Local summary too long for current model')) {
    return i18n.t('ai.privateModeTooLongForLocal');
  }

  return i18n.t('ai.privateModeGenericError');
}

export async function runLocalSummaryTasks(
  request: SummaryTaskRequest,
  ctx: AiExecutionContext,
): Promise<SummaryTaskResult> {
  try {
    const maxChars = getMaxTranscriptChars(ctx.privateCapabilityTier);
    const transcript = request.transcript.slice(0, maxChars);
    const systemPrompt =
      'You summarize voice notes. Return strict JSON only with keys: summary (string), suggestedTitle (string), tasks (array of {title, priority: high|medium|low, deadline: string|null}), tags (string[]), classification (personal|work|meeting|idea|other), keyPhrases (string[]), nextSteps (string[]). No markdown.';

    const buildUserPrompt = (transcriptText: string) =>
      [
        `Output language: ${ctx.aiOutputLanguage}.`,
        `Summary style: ${ctx.summaryStyle}.`,
        `Task strictness: ${ctx.taskStrictness}.`,
        'Transcript:',
        transcriptText,
      ].join('\n');

    const candidateTranscript =
      transcript.length > SAFE_LOCAL_SUMMARY_CHARS
        ? transcript.slice(0, SAFE_LOCAL_SUMMARY_CHARS)
        : transcript;

    const raw = await generateWithLocalLlm(
      ctx.selectedLocalAiModel,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(candidateTranscript) },
      ],
      { maxTokens: 900, temperature: 0.2 },
    );

    const jsonPayload = extractJsonObject(raw);

    if (!jsonPayload) {
      throw new Error('Invalid local summary response');
    }

    const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

    if (!summary) {
      throw new Error('Local summary is empty');
    }

    const suggestedTitle =
      typeof parsed.suggestedTitle === 'string' ? parsed.suggestedTitle.trim() : undefined;
    const classification =
      parsed.classification === 'personal' ||
      parsed.classification === 'work' ||
      parsed.classification === 'meeting' ||
      parsed.classification === 'idea' ||
      parsed.classification === 'other'
        ? parsed.classification
        : undefined;

    return {
      ok: true,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      result: {
        summary,
        ...(suggestedTitle ? { suggestedTitle } : {}),
        tasks: safeTasks(parsed.tasks),
        tags: safeStringArray(parsed.tags),
        ...(classification ? { classification } : {}),
        keyPhrases: safeStringArray(parsed.keyPhrases),
        nextSteps: safeStringArray(parsed.nextSteps),
      },
    };
  } catch (err) {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: mapLocalError(err),
    };
  }
}

export async function runLocalAsk(
  request: AskRequest,
  ctx: AiExecutionContext,
): Promise<AskTaskResult> {
  try {
    const transcript = request.transcript.slice(
      0,
      getMaxTranscriptChars(ctx.privateCapabilityTier),
    );
    const raw = await generateWithLocalLlm(
      ctx.selectedLocalAiModel,
      [
        {
          role: 'system',
          content:
            'You answer questions about a voice note transcript. Keep answers concise, factual, and grounded in the transcript.',
        },
        {
          role: 'user',
          content: `Transcript:\n${transcript}\n\nQuestion:\n${request.question}`,
        },
      ],
      { maxTokens: 600, temperature: 0.25 },
    );

    const answer = raw.trim();
    if (!answer) {
      throw new Error('Local answer is empty');
    }

    return {
      ok: true,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      result: { answer },
    };
  } catch (err) {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: mapLocalError(err),
    };
  }
}
