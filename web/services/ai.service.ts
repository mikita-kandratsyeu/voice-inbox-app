import {
  filterModelsForAiChat,
  isRetryableAiChatTransportError,
  sendAiChatCompletion,
} from '@/lib/ai-chat';
import { isDeepSeekOpenRouterModel } from '@/lib/deepseek';
import { extractDeepSeekReasoning } from '@/lib/deepseek-reasoning';
import { withSequentialModelFallback } from '@/lib/ai-model-fallback';
import { extractOpenRouterReasoning } from '@/lib/openrouter-reasoning';
import { extractOpenRouterTokenUsage } from '@/lib/openrouter-token-usage';
import { withTimeout, TIMEOUTS } from '@/lib/timeout';
import {
  AUTO_ORGANIZE_MAX_SUMMARY_CHARS,
  AUTO_ORGANIZE_MAX_TITLE_CHARS,
  AUTO_ORGANIZE_MAX_TRANSCRIPT_CHARS,
  AUTO_ORGANIZE_TRANSCRIPT_HINT_MAX_CHARS,
  smartTranscriptExcerpt,
} from '@/lib/auto-organize-input-limits';
import {
  assertAutoOrganizeArchiveComplete,
  assertAutoOrganizeFoldersComplete,
  isAutoOrganizeParseFailure,
  parseAutoOrganizeResultForMode,
  type AutoOrganizeParsedResult,
} from '@/lib/auto-organize-parse';
import {
  buildAutoOrganizeRepairUserSuffix,
  buildAutoOrganizeSystemPrompt,
} from '@/lib/auto-organize-prompt';
import type { AutoOrganizeMode, AutoOrganizeTemplate } from '@/lib/auto-organize-types';
import { normalizeAutoOrganizeTemplate } from '@/lib/auto-organize-types';
import { buildAskUserMessageContent } from '@/lib/ask-user-message';
import { parseOpenRouterJsonContent } from '@/lib/parse-openrouter-json';
import type { RecordingMarkForPrompt } from '@/lib/recording-marks-prompt';
import { ASK_QUESTION_SYSTEM_PROMPT } from '@/lib/prompts';
import type { AiResult, AutoOrganizeResult, RecordClassification } from '@/types';

import {
  MEETING_DIALOGUE_MODEL_FALLBACK_CHAIN,
  SYSTEM_TASK_MODEL_FALLBACK_CHAIN,
  USER_AI_MODEL_FALLBACK_CHAIN,
} from '@/config/constants';

const MEETING_DIALOGUE_MARKDOWN_MAX_CHARS = 12_000;

function stripOptionalMarkdownFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeMeetingDialogueMarkdownField(
  rawMd: string,
): Pick<AiResult, 'meetingDialogueMarkdown'> {
  const trimmed = rawMd.trim();
  if (!trimmed) {
    return {};
  }
  const meetingDialogueMarkdown =
    trimmed.length > MEETING_DIALOGUE_MARKDOWN_MAX_CHARS
      ? trimmed.slice(0, MEETING_DIALOGUE_MARKDOWN_MAX_CHARS)
      : trimmed;
  return { meetingDialogueMarkdown };
}

function buildSummaryAiResult(
  content: string,
  message: unknown,
  response: unknown,
  extractReasoning: (msg: unknown) => string | undefined,
): AiResult {
  const parsed = parseOpenRouterJsonContent(content);
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

  const reasoningText = extractReasoning(message);
  const tokenUsage = extractOpenRouterTokenUsage(response);

  return {
    summary: String(parsed.summary),
    suggestedTitle: suggestedTitle || String(parsed.summary).slice(0, 50).trim() || 'Voice note',
    tasks,
    tags,
    ...(classification && { classification }),
    ...(keyPhrases.length > 0 && { keyPhrases }),
    ...(nextSteps.length > 0 && { nextSteps }),
    ...(reasoningText ? { reasoning: reasoningText } : {}),
    ...(tokenUsage ? { tokenUsage } : {}),
  };
}

async function callSummaryModel(
  transcript: string,
  model: string,
  systemPrompt: string,
  clientUserAgent?: string | null,
  deviceId?: string | null,
): Promise<AiResult> {
  const { content, message, raw } = await withTimeout(
    sendAiChatCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      jsonObject: true,
      withReasoning: true,
      temperature: isDeepSeekOpenRouterModel(model) ? undefined : 0.3,
      clientUserAgent,
      userId: deviceId,
    }),
    TIMEOUTS.AI_PROCESSING,
    'AI summary processing timeout',
  );

  const extractReasoningFn = isDeepSeekOpenRouterModel(model)
    ? extractDeepSeekReasoning
    : extractOpenRouterReasoning;

  return buildSummaryAiResult(content, message, raw, extractReasoningFn);
}

type AskAnswerKind = 'plain' | 'list' | 'tasks' | 'decisions';
type AskEvidence = {
  quote: string;
  source?: 'transcript' | 'summary' | 'tasks' | 'recording_mark' | 'prior_conversation';
  offsetMs?: number | null;
  label?: string;
};
type AskAnswerResult = {
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  suggestedFollowUps?: string[];
};

const ASK_ANSWER_KINDS = new Set<AskAnswerKind>(['plain', 'list', 'tasks', 'decisions']);
const ASK_ITEMS_MAX = 12;
const ASK_ITEM_MAX_CHARS = 500;
const ASK_EVIDENCE_MAX = 5;
const ASK_EVIDENCE_QUOTE_MAX_CHARS = 500;
const ASK_EVIDENCE_LABEL_MAX_CHARS = 120;
const ASK_FOLLOW_UP_MAX = 3;
const ASK_FOLLOW_UP_MAX_CHARS = 180;

function sanitizeAskAnswerKind(value: unknown): AskAnswerKind | undefined {
  return typeof value === 'string' && ASK_ANSWER_KINDS.has(value as AskAnswerKind)
    ? (value as AskAnswerKind)
    : undefined;
}

function sanitizeAskItems(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((item) => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .slice(0, ASK_ITEMS_MAX)
    .map((item) => item.slice(0, ASK_ITEM_MAX_CHARS));
  return out.length ? out : undefined;
}

function sanitizeAskFollowUps(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((item) => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .slice(0, ASK_FOLLOW_UP_MAX)
    .map((item) => item.slice(0, ASK_FOLLOW_UP_MAX_CHARS));
  return out.length ? out : undefined;
}

function sanitizeAskEvidence(value: unknown): AskEvidence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: AskEvidence[] = [];
  for (const item of value.slice(0, ASK_EVIDENCE_MAX)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const quote = typeof o.quote === 'string' ? o.quote.replace(/\s+/g, ' ').trim() : '';
    if (!quote) continue;
    const source = typeof o.source === 'string' ? o.source : undefined;
    const offsetMs =
      typeof o.offsetMs === 'number' && Number.isFinite(o.offsetMs)
        ? Math.max(0, Math.round(o.offsetMs))
        : o.offsetMs === null
          ? null
          : undefined;
    const label =
      typeof o.label === 'string'
        ? o.label.replace(/\s+/g, ' ').trim().slice(0, ASK_EVIDENCE_LABEL_MAX_CHARS)
        : undefined;
    out.push({
      quote: quote.slice(0, ASK_EVIDENCE_QUOTE_MAX_CHARS),
      ...(source ? { source: source as AskEvidence['source'] } : {}),
      ...(offsetMs !== undefined ? { offsetMs } : {}),
      ...(label ? { label } : {}),
    });
  }
  return out.length ? out : undefined;
}

function extractAnswerFromResponse(responseContent: string): AskAnswerResult {
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
          if (typeof val === 'string' && val.length > 0) {
            const answerKind = sanitizeAskAnswerKind(obj.answerKind);
            const items = sanitizeAskItems(obj.items);
            const evidence = sanitizeAskEvidence(obj.evidence);
            const suggestedFollowUps = sanitizeAskFollowUps(obj.suggestedFollowUps);
            return {
              answer: val,
              ...(answerKind ? { answerKind } : {}),
              ...(items ? { items } : {}),
              ...(evidence ? { evidence } : {}),
              ...(suggestedFollowUps ? { suggestedFollowUps } : {}),
            };
          }
        }
        const firstString = Object.values(obj).find((v) => typeof v === 'string' && v.length > 0);
        if (typeof firstString === 'string') return { answer: firstString };
      }
    } catch {
      console.warn('Invalid AI response: JSON parse failed', responseContent);

      return { answer: trimmed };
    }
  }

  return { answer: trimmed };
}

export async function processTranscript(
  transcript: string,
  model: string,
  systemPrompt: string,
  clientUserAgent?: string | null,
  deviceId?: string | null,
): Promise<AiResult> {
  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);

  return withSequentialModelFallback(
    models,
    (m) => callSummaryModel(transcript, m, systemPrompt, clientUserAgent, deviceId),
    (err) =>
      isRetryableAiChatTransportError(err) ||
      (err instanceof Error && err.message.startsWith('Invalid AI response')),
  );
}

function parseMeetingDialogueOpenRouterContent(
  content: string,
): Pick<AiResult, 'meetingDialogueMarkdown'> {
  try {
    const parsed = parseOpenRouterJsonContent(content);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid AI response: meeting dialogue expected object');
    }
    const rawMd =
      'meetingDialogueMarkdown' in parsed &&
      typeof (parsed as { meetingDialogueMarkdown?: unknown }).meetingDialogueMarkdown === 'string'
        ? String((parsed as { meetingDialogueMarkdown: string }).meetingDialogueMarkdown).trim()
        : '';
    return normalizeMeetingDialogueMarkdownField(rawMd);
  } catch (err) {
    const plain = stripOptionalMarkdownFences(content);
    if (plain && !plain.startsWith('{')) {
      return normalizeMeetingDialogueMarkdownField(plain);
    }
    throw err;
  }
}

/**
 * Second OpenRouter pass: only pseudo-diarization JSON. Same weekly limit slot as the main transcript run.
 * Always uses {@link MEETING_DIALOGUE_MODEL} (Gemini 3.1 Flash Lite), not the user’s summarize model.
 */
export async function processMeetingDialogueMarkdown(
  userContent: string,
  systemPrompt: string,
  clientUserAgent?: string | null,
  deviceId?: string | null,
): Promise<Pick<AiResult, 'meetingDialogueMarkdown' | 'tokenUsage'>> {
  const models = filterModelsForAiChat([...MEETING_DIALOGUE_MODEL_FALLBACK_CHAIN]);

  return withTimeout(
    withSequentialModelFallback(
      models,
      async (m) => {
        const { content, raw } = await sendAiChatCompletion({
          model: m,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          jsonObject: true,
          temperature: isDeepSeekOpenRouterModel(m) ? undefined : 0.3,
          clientUserAgent,
          userId: deviceId,
        });

        const tokenUsage = extractOpenRouterTokenUsage(raw);
        return {
          ...parseMeetingDialogueOpenRouterContent(content),
          ...(tokenUsage ? { tokenUsage } : {}),
        };
      },
      (err) =>
        isRetryableAiChatTransportError(err) ||
        (err instanceof Error && err.message.startsWith('Invalid AI response')),
    ),
    TIMEOUTS.AI_PROCESSING,
    'Meeting dialogue processing timeout',
  );
}

export async function processAskQuestion(
  transcript: string,
  question: string,
  model: string,
  summary?: string,
  tasks?: { text: string }[],
  priorTurns?: { question: string; answer: string }[],
  clientUserAgent?: string | null,
  recordingMarks?: RecordingMarkForPrompt[],
  deviceId?: string | null,
): Promise<AskAnswerResult> {
  const userContent = buildAskUserMessageContent(
    transcript,
    question,
    summary,
    tasks,
    priorTurns,
    recordingMarks,
  );

  const callAsk = async (m: string): Promise<AskAnswerResult> => {
    const { content } = await withTimeout(
      sendAiChatCompletion({
        model: m,
        messages: [
          { role: 'system', content: ASK_QUESTION_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        jsonObject: true,
        temperature: isDeepSeekOpenRouterModel(m) ? undefined : 0.3,
        clientUserAgent,
        userId: deviceId,
      }),
      TIMEOUTS.AI_CHAT,
      'AI ask processing timeout',
    );

    return extractAnswerFromResponse(content);
  };

  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);

  return withSequentialModelFallback(models, callAsk, isRetryableAiChatTransportError);
}

const DIGEST_SYSTEM_PROMPT = `You write a daily, weekly, or rolling 30-day digest for Voice Inbox AI from already-extracted note metadata.

Return exactly one valid JSON object.
No code fences, explanations, comments, or text outside JSON.

Output schema:
{
  "markdown": string,
  "highlights": string[],
  "risks": string[],
  "nextActions": string[]
}

Rules:
- Use only the provided notes, tasks, key phrases, next steps, and counts.
- Do not invent meetings, decisions, people, dates, or deadlines.
- Match the requested language exactly: "en" -> English, "ru" -> Russian.
- Read the requested format from payload.format: "brief", "detailed", or "tasks".
- markdown must use clear headings and bullet lists.
- For "brief", use 3 compact sections: Main, Needs attention, Next actions. In Russian: Главное, Требует внимания, Следующие действия.
- For "detailed", use these sections in order: Main, Needs attention, Decisions / agreements, Next actions, Risks / overdue. In Russian: Главное, Требует внимания, Решения / договорённости, Следующие действия, Риски / просрочки.
- For "tasks", focus only on actionable work with these sections: Next actions, Risks / overdue. In Russian: Следующие действия, Риски / просрочки.
- Omit a section only when there is truly no grounded information for it.
- highlights: 3-6 most important themes or outcomes.
- risks: 0-4 overdue, blocked, urgent, or repeated issues if supported.
- nextActions: 1-6 practical follow-up actions grounded in tasks or nextSteps.
- If there is little data, say what is missing briefly and avoid filler.`;

function parseDigestResult(responseContent: string): {
  markdown: string;
  highlights: string[];
  risks: string[];
  nextActions: string[];
} {
  const parsed = parseOpenRouterJsonContent(responseContent);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response: expected object');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.markdown !== 'string' || !obj.markdown.trim()) {
    throw new Error('Invalid AI response: missing markdown');
  }

  const readStringArray = (key: string): string[] =>
    Array.isArray(obj[key])
      ? obj[key]
          .filter((item: unknown) => typeof item === 'string')
          .map((item: string) => item.trim())
          .filter(Boolean)
      : [];

  return {
    markdown: obj.markdown.trim(),
    highlights: readStringArray('highlights'),
    risks: readStringArray('risks'),
    nextActions: readStringArray('nextActions'),
  };
}

export async function processDigest(
  digestPayload: string,
  model: string,
  clientUserAgent?: string | null,
): Promise<{
  markdown: string;
  highlights: string[];
  risks: string[];
  nextActions: string[];
}> {
  const callDigest = async (m: string) => {
    const { content } = await sendAiChatCompletion({
      model: m,
      messages: [
        { role: 'system', content: DIGEST_SYSTEM_PROMPT },
        { role: 'user', content: digestPayload },
      ],
      jsonObject: true,
      temperature: isDeepSeekOpenRouterModel(m) ? undefined : 0.25,
      clientUserAgent,
    });

    return parseDigestResult(content);
  };

  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);
  return withSequentialModelFallback(
    models,
    callDigest,
    (err) =>
      isRetryableAiChatTransportError(err) ||
      (err instanceof Error && err.message.startsWith('Invalid AI response')),
  );
}

function extractExpectedNoteIdsFromCompactPayload(compactPayload: string): string[] {
  try {
    const p = JSON.parse(compactPayload) as { notes?: unknown };
    if (!Array.isArray(p.notes)) return [];
    return p.notes
      .map((n) => {
        if (!n || typeof n !== 'object') return '';
        const id = (n as { id?: unknown }).id;
        return typeof id === 'string' ? id.trim() : '';
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function compactAutoOrganizeInput(notesJsonPayload: string): string {
  try {
    const parsed = JSON.parse(notesJsonPayload) as unknown;
    if (!parsed || typeof parsed !== 'object') return notesJsonPayload;
    const obj = parsed as { notes?: unknown };
    if (!Array.isArray(obj.notes)) return notesJsonPayload;

    const truncateText = (s: unknown, maxChars: number): string | undefined => {
      if (typeof s !== 'string') return undefined;
      const trimmed = s.trim();
      if (!trimmed) return undefined;
      return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, maxChars)}...`;
    };

    const compactNotes = obj.notes
      .map((note) => {
        if (!note || typeof note !== 'object') return null;
        const n = note as Record<string, unknown>;

        const id = typeof n.id === 'string' ? n.id.trim() : '';

        if (!id) return null;

        const summary = truncateText(n.summary, AUTO_ORGANIZE_MAX_SUMMARY_CHARS);
        const rawTranscript =
          typeof n.transcript === 'string' && n.transcript.trim() ? n.transcript.trim() : '';

        const transcriptOut = rawTranscript
          ? summary
            ? smartTranscriptExcerpt(rawTranscript, AUTO_ORGANIZE_TRANSCRIPT_HINT_MAX_CHARS)
            : smartTranscriptExcerpt(rawTranscript, AUTO_ORGANIZE_MAX_TRANSCRIPT_CHARS)
          : undefined;

        const next: Record<string, unknown> = { id };

        if (typeof n.title === 'string' && n.title.trim()) {
          next.title = n.title.trim().slice(0, AUTO_ORGANIZE_MAX_TITLE_CHARS);
        }

        if (summary) {
          next.summary = summary;
        }
        if (transcriptOut) {
          next.transcript = transcriptOut;
        }

        if (typeof n.classification === 'string' && n.classification.trim()) {
          next.classification = n.classification.trim();
        }

        if (typeof n.createdAt === 'string' && n.createdAt.trim()) {
          next.createdAt = n.createdAt.trim().slice(0, 10);
        }

        if (typeof n.ageDays === 'number' && Number.isFinite(n.ageDays) && n.ageDays >= 0) {
          next.ageDays = Math.floor(n.ageDays);
        }

        if (typeof n.folderName === 'string' && n.folderName.trim()) {
          next.folderName = n.folderName.trim();
        }

        if (n.isPinned === true) {
          next.isPinned = true;
        }

        if (n.isRead === true) {
          next.isRead = true;
        }

        if (typeof n.taskCount === 'number' && Number.isFinite(n.taskCount) && n.taskCount > 0) {
          next.taskCount = Math.floor(n.taskCount);
        }

        return next;
      })
      .filter(Boolean);

    const src = parsed as Record<string, unknown>;
    const out: Record<string, unknown> = { notes: compactNotes };

    if (typeof src.appLanguage === 'string' && src.appLanguage.trim()) {
      out.appLanguage = src.appLanguage.trim().toLowerCase().slice(0, 2);
    }

    if (Array.isArray(src.existingFolders)) {
      out.existingFolders = src.existingFolders;
    }

    if (typeof src.mode === 'string' && src.mode.trim()) {
      out.mode = src.mode.trim();
    }

    if (typeof src.template === 'string' && src.template.trim()) {
      out.template = src.template.trim();
    }

    return JSON.stringify(out);
  } catch {
    return notesJsonPayload;
  }
}

function assertAutoOrganizeParsedComplete(
  result: AutoOrganizeParsedResult,
  mode: AutoOrganizeMode,
  expectedIds: string[],
): void {
  if (mode === 'suggest_archive') {
    assertAutoOrganizeArchiveComplete(
      result as import('@/lib/auto-organize-types').AutoOrganizeArchiveResult,
      expectedIds,
    );
    return;
  }

  if (mode === 'consolidate_folders') {
    return;
  }

  assertAutoOrganizeFoldersComplete(
    result as import('@/lib/auto-organize-types').AutoOrganizeFoldersResult,
    expectedIds,
    mode,
  );
}

export async function processAutoOrganizeFolders(
  notesJsonPayload: string,
  model: string,
  options?: {
    clientUserAgent?: string | null;
    mode?: AutoOrganizeMode;
    template?: AutoOrganizeTemplate;
  },
): Promise<AutoOrganizeResult> {
  const mode = options?.mode ?? 'full';
  const template = normalizeAutoOrganizeTemplate(options?.template);
  const clientUserAgent = options?.clientUserAgent;
  const compactPayload = compactAutoOrganizeInput(notesJsonPayload);
  let expectedIds = extractExpectedNoteIdsFromCompactPayload(compactPayload);
  if (expectedIds.length === 0) {
    expectedIds = extractExpectedNoteIdsFromCompactPayload(notesJsonPayload);
  }

  const systemPrompt = buildAutoOrganizeSystemPrompt(mode, template);

  const sendOrganize = async (m: string, userContent: string): Promise<AutoOrganizeResult> => {
    const { content } = await sendAiChatCompletion({
      model: m,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      jsonObject: true,
      temperature: isDeepSeekOpenRouterModel(m) ? undefined : 0.12,
      clientUserAgent,
    });

    const result = parseAutoOrganizeResultForMode(content, mode);
    assertAutoOrganizeParsedComplete(result, mode, expectedIds);
    return result;
  };

  const organizeWithRepair = async (m: string): Promise<AutoOrganizeResult> => {
    try {
      return await sendOrganize(m, compactPayload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (!msg.startsWith('Invalid AI response')) {
        throw e;
      }
      return await sendOrganize(
        m,
        compactPayload + buildAutoOrganizeRepairUserSuffix(mode, expectedIds),
      );
    }
  };

  const models = filterModelsForAiChat([model, ...SYSTEM_TASK_MODEL_FALLBACK_CHAIN]);
  return withSequentialModelFallback(
    models,
    organizeWithRepair,
    (err) => isRetryableAiChatTransportError(err) || isAutoOrganizeParseFailure(err),
  );
}
