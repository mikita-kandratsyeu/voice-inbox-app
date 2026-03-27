import type { AiOutputLanguage, SummaryStyle, TaskStrictness } from '@/entities/settings';
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

const LOCAL_LLM_MAX_TRANSCRIPT_CHARS = 6000;

const LOCAL_LLM_SUMMARY_MAX_TOKENS = 680;
const LOCAL_LLM_ASK_MAX_TOKENS = 450;

const LOCAL_ASK_SUMMARY_MAX_CHARS = 2000;
const LOCAL_ASK_MAX_TASK_ITEMS = 25;

const LOCAL_SUMMARY_STYLE_HINT: Record<SummaryStyle, string> = {
  brief: 'Summary length: 1–2 short sentences. Prose only, no bullet lists.',
  standard: 'Summary length: 2–4 sentences. Prose only, no bullet lists.',
  detailed: 'Summary length: about 4–6 sentences. Prose only, no bullet lists.',
};

const LOCAL_TASK_STRICTNESS_HINT: Record<TaskStrictness, string> = {
  strict:
    'tasks: only clear, explicit actions. Skip vague wishes, ideas without a concrete next step.',
  balanced:
    'tasks: explicit actions plus clearly implied ones. Do not invent obligations not supported by the transcript.',
  soft: 'tasks: include reasonable intentions and plans that could become actionable.',
};

const LOCAL_OUTPUT_LANGUAGE_HINT: Record<AiOutputLanguage, string> = {
  same: 'Language: write summary, suggestedTitle, every task title, tags, keyPhrases, and nextSteps in the SAME language as the transcript.',
  ru: 'Language: write ALL of those text fields in Russian, even if the transcript is not Russian.',
  en: 'Language: write ALL of those text fields in English, even if the transcript is not English.',
};

const LOCAL_SUMMARY_SYSTEM_BASE = [
  'You extract one JSON object from a voice-note transcript. No markdown, no code fences, no text outside JSON.',
  'All string values are plain text (no markdown). Follow the user message for language, summary length, and task strictness.',
  'Be faithful to the transcript; do not invent people, dates, or commitments.',
  'Fields: summary, suggestedTitle, tasks[], tags[], classification, keyPhrases[], nextSteps[].',
  'tasks items: {title, priority, deadline}. priority: high|medium|low. deadline: YYYY-MM-DD or null.',
  'classification one of: personal|work|meeting|idea|other — pick the dominant theme.',
  'suggestedTitle: short (about 3–8 words), specific; not generic like "Voice note" unless content is empty or unusable.',
  'deadline: use Reference date only for relative phrases ("tomorrow", weekdays). If unsure, null. Never guess vague timing.',
  'tags: 2–5 short lowercase topic tags when clear; not "note", "voice", "recording", "заметка".',
  'keyPhrases: 3–8 short entities or phrases; not full sentences.',
  'nextSteps: 0–3 high-level follow-ups; must not repeat task titles verbatim.',
  'Weak or empty transcript: tasks/tags/keyPhrases/nextSteps [], classification "other", suggestedTitle a minimal generic title in the output language.',
].join(' ');

function getLocalReferenceDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildLocalSummarySystemPrompt(referenceDate: string): string {
  return `${LOCAL_SUMMARY_SYSTEM_BASE} Reference date (for deadlines only): ${referenceDate}.`;
}

function buildLocalSummaryUserContent(transcriptText: string, ctx: AiExecutionContext): string {
  return [
    LOCAL_OUTPUT_LANGUAGE_HINT[ctx.aiOutputLanguage],
    LOCAL_SUMMARY_STYLE_HINT[ctx.summaryStyle],
    LOCAL_TASK_STRICTNESS_HINT[ctx.taskStrictness],
    '',
    'Transcript:',
    transcriptText,
  ].join('\n');
}

function buildLocalAskUserContent(request: AskRequest, transcript: string): string {
  const blocks: string[] = [`Question:\n${request.question.trim()}`, `Transcript:\n${transcript}`];
  const summary = request.summary?.trim();
  if (summary) {
    blocks.push(`Summary:\n${summary.slice(0, LOCAL_ASK_SUMMARY_MAX_CHARS)}`);
  }
  const tasks = request.tasks?.filter((t) => t.text.trim()) ?? [];
  if (tasks.length > 0) {
    const lines = tasks.slice(0, LOCAL_ASK_MAX_TASK_ITEMS).map((t) => `- ${t.text.trim()}`);
    blocks.push(`Tasks:\n${lines.join('\n')}`);
  }
  return blocks.join('\n\n');
}

function getMaxTranscriptChars(tier: AiExecutionContext['privateCapabilityTier']): number {
  if (tier === 'limited' || tier === 'unavailable') return 5000;
  return 14000;
}

function sliceTranscriptForLocalLlm(
  transcript: string,
  tier: AiExecutionContext['privateCapabilityTier'],
): string {
  const tierCap = getMaxTranscriptChars(tier);
  const capped = transcript.slice(0, tierCap);
  return capped.length > LOCAL_LLM_MAX_TRANSCRIPT_CHARS
    ? capped.slice(0, LOCAL_LLM_MAX_TRANSCRIPT_CHARS)
    : capped;
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

function extractAskAnswer(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const jsonPayload = extractJsonObject(trimmed);
    if (jsonPayload) {
      const parsed = JSON.parse(jsonPayload) as { answer?: unknown };
      if (typeof parsed.answer === 'string') {
        const a = parsed.answer.trim();
        if (a.length > 0) return a;
      }
    }
  } catch {
    // use plain-text fallback below
  }
  if (!trimmed.startsWith('{')) {
    return trimmed;
  }
  return null;
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
    const candidateTranscript = sliceTranscriptForLocalLlm(
      request.transcript,
      ctx.privateCapabilityTier,
    );

    const systemPrompt = buildLocalSummarySystemPrompt(getLocalReferenceDateIso());

    const raw = await generateWithLocalLlm(
      ctx.selectedLocalAiModel,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildLocalSummaryUserContent(candidateTranscript, ctx) },
      ],
      { maxTokens: LOCAL_LLM_SUMMARY_MAX_TOKENS, temperature: 0.2 },
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
    const transcript = sliceTranscriptForLocalLlm(request.transcript, ctx.privateCapabilityTier);

    const askSystemPrompt = [
      'Use ONLY the provided blocks (Question, Transcript, and optional Summary/Tasks).',
      'Answer concisely in the SAME language as the Question.',
      'If the context does not support an answer, say so in one short sentence. Do not invent facts.',
      'No markdown. Return exactly one JSON object: {"answer":"your plain text here"}. No other keys, no code fences.',
    ].join(' ');

    const raw = await generateWithLocalLlm(
      ctx.selectedLocalAiModel,
      [
        { role: 'system', content: askSystemPrompt },
        { role: 'user', content: buildLocalAskUserContent(request, transcript) },
      ],
      { maxTokens: LOCAL_LLM_ASK_MAX_TOKENS, temperature: 0.25 },
    );

    const answer = extractAskAnswer(raw);
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
