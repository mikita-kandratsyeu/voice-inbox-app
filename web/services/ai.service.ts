import { createOpenRouterClient } from '@/lib/openrouter';
import {
  isRetryableOpenRouterTransportError,
  withSequentialModelFallback,
} from '@/lib/ai-model-fallback';
import { openRouterJsonObjectResponseFormat } from '@/lib/openrouter-response-format';
import {
  AUTO_ORGANIZE_MAX_SUMMARY_CHARS,
  AUTO_ORGANIZE_MAX_TITLE_CHARS,
  AUTO_ORGANIZE_MAX_TRANSCRIPT_CHARS,
  AUTO_ORGANIZE_TRANSCRIPT_HINT_MAX_CHARS,
  smartTranscriptExcerpt,
} from '@/lib/auto-organize-input-limits';
import { normalizeAutoOrganizeFolderColor } from '@/lib/folder-accent-colors';
import { buildAskUserMessageContent } from '@/lib/ask-user-message';
import type { RecordingMarkForPrompt } from '@/lib/recording-marks-prompt';
import { ASK_QUESTION_SYSTEM_PROMPT, AUTO_ORGANIZE_FOLDERS_SYSTEM_PROMPT } from '@/lib/prompts';
import type { AiResult, AutoOrganizeResult, RecordClassification } from '@/types';

import { SYSTEM_TASK_MODEL_FALLBACK_CHAIN, USER_AI_MODEL_FALLBACK_CHAIN } from '@/config/constants';

const MEETING_DIALOGUE_MARKDOWN_MAX_CHARS = 12_000;

async function callOpenRouter(
  transcript: string,
  model: string,
  systemPrompt: string,
  clientUserAgent?: string | null,
): Promise<AiResult> {
  const client = createOpenRouterClient(clientUserAgent);
  const response = await client.chat.send({
    chatGenerationParams: {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      provider: { zdr: true },
      responseFormat: openRouterJsonObjectResponseFormat(),
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
  clientUserAgent?: string | null,
): Promise<AiResult> {
  const models = [model, ...USER_AI_MODEL_FALLBACK_CHAIN];

  return withSequentialModelFallback(
    models,
    (m) => callOpenRouter(transcript, m, systemPrompt, clientUserAgent),
    isRetryableOpenRouterTransportError,
  );
}

function parseMeetingDialogueOpenRouterContent(
  content: string,
): Pick<AiResult, 'meetingDialogueMarkdown'> {
  const parsed = JSON.parse(content.trim()) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response: meeting dialogue expected object');
  }
  const rawMd =
    'meetingDialogueMarkdown' in parsed &&
    typeof (parsed as { meetingDialogueMarkdown?: unknown }).meetingDialogueMarkdown === 'string'
      ? String((parsed as { meetingDialogueMarkdown: string }).meetingDialogueMarkdown).trim()
      : '';
  if (!rawMd) {
    return {};
  }
  const meetingDialogueMarkdown =
    rawMd.length > MEETING_DIALOGUE_MARKDOWN_MAX_CHARS
      ? rawMd.slice(0, MEETING_DIALOGUE_MARKDOWN_MAX_CHARS)
      : rawMd;
  return { meetingDialogueMarkdown };
}

/**
 * Second OpenRouter pass: only pseudo-diarization JSON. Same weekly limit slot as the main transcript run.
 */
export async function processMeetingDialogueMarkdown(
  userContent: string,
  model: string,
  systemPrompt: string,
  clientUserAgent?: string | null,
): Promise<Pick<AiResult, 'meetingDialogueMarkdown'>> {
  const models = [model, ...USER_AI_MODEL_FALLBACK_CHAIN];

  return withSequentialModelFallback(
    models,
    async (m) => {
      const client = createOpenRouterClient(clientUserAgent);
      const response = await client.chat.send({
        chatGenerationParams: {
          model: m,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          provider: { zdr: true },
          responseFormat: openRouterJsonObjectResponseFormat(),
          temperature: 0.3,
          stream: false,
        },
      });

      const responseContent = response.choices[0]?.message?.content;
      if (typeof responseContent !== 'string') {
        throw new Error('Invalid AI response: missing content');
      }

      return parseMeetingDialogueOpenRouterContent(responseContent);
    },
    isRetryableOpenRouterTransportError,
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
): Promise<{ answer: string }> {
  const userContent = buildAskUserMessageContent(
    transcript,
    question,
    summary,
    tasks,
    priorTurns,
    recordingMarks,
  );

  const callAsk = async (
    content: string,
    m: string,
    sysPrompt: string,
  ): Promise<{ answer: string }> => {
    const client = createOpenRouterClient(clientUserAgent);
    const response = await client.chat.send({
      chatGenerationParams: {
        model: m,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content },
        ],
        provider: { zdr: true },
        responseFormat: openRouterJsonObjectResponseFormat(),
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
- Keep the digest concise and useful.
- markdown may use headings and bullet lists.
- highlights: 3-6 most important themes or outcomes.
- risks: 0-4 overdue, blocked, urgent, or repeated issues if supported.
- nextActions: 1-6 practical follow-up actions grounded in tasks or nextSteps.
- If there is little data, say that briefly and avoid filler.`;

function parseDigestResult(responseContent: string): {
  markdown: string;
  highlights: string[];
  risks: string[];
  nextActions: string[];
} {
  const trimmed = responseContent.trim();
  const parsed = JSON.parse(trimmed) as unknown;
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
    const client = createOpenRouterClient(clientUserAgent);
    const response = await client.chat.send({
      chatGenerationParams: {
        model: m,
        messages: [
          { role: 'system', content: DIGEST_SYSTEM_PROMPT },
          { role: 'user', content: digestPayload },
        ],
        provider: { zdr: true },
        responseFormat: openRouterJsonObjectResponseFormat(),
        temperature: 0.25,
        stream: false,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid AI response: missing content');
    }

    return parseDigestResult(content);
  };

  const models = [model, ...USER_AI_MODEL_FALLBACK_CHAIN];
  return withSequentialModelFallback(
    models,
    callDigest,
    (err) =>
      isRetryableOpenRouterTransportError(err) ||
      (err instanceof Error && err.message.startsWith('Invalid AI response')),
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

  const folderRows = obj.folders
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

  if (folderRows.length === 0) {
    throw new Error('Invalid AI response: no valid folders');
  }

  const canonicalByLower = new Map<string, (typeof folderRows)[0]>();
  for (const f of folderRows) {
    const k = f.name.toLowerCase();
    if (!canonicalByLower.has(k)) {
      canonicalByLower.set(k, f);
    }
  }
  const folders = [...canonicalByLower.values()];

  const seenRecordIds = new Set<string>();
  const assignments: AutoOrganizeResult['assignments'] = [];

  for (const raw of obj.assignments) {
    const recordId = typeof raw?.recordId === 'string' ? raw.recordId.trim() : '';
    const folderName = typeof raw?.folderName === 'string' ? raw.folderName.trim() : '';
    if (!recordId) {
      throw new Error('Invalid AI response: assignment with empty recordId');
    }
    if (seenRecordIds.has(recordId)) {
      throw new Error('Invalid AI response: duplicate recordId in assignments');
    }
    seenRecordIds.add(recordId);
    if (!folderName) {
      throw new Error('Invalid AI response: assignment with empty folderName');
    }
    const canon = canonicalByLower.get(folderName.toLowerCase());
    if (!canon) {
      throw new Error(`Invalid AI response: unknown folder in assignment: ${folderName}`);
    }
    assignments.push({ recordId, folderName: canon.name });
  }

  if (assignments.length === 0) {
    throw new Error('Invalid AI response: no valid assignments');
  }

  return { folders, assignments };
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

function assertAutoOrganizeComplete(result: AutoOrganizeResult, expectedIds: string[]): void {
  if (expectedIds.length === 0) {
    return;
  }

  if (result.folders.length < 3 || result.folders.length > 8) {
    throw new Error(`Invalid AI response: folders must be 3-8, got ${result.folders.length}`);
  }

  const expected = new Set(expectedIds);
  const got = new Set(result.assignments.map((a) => a.recordId));

  if (got.size !== result.assignments.length) {
    throw new Error('Invalid AI response: duplicate recordId in assignments');
  }

  if (got.size !== expected.size) {
    throw new Error(`Invalid AI response: expected ${expected.size} assignments, got ${got.size}`);
  }

  for (const id of expected) {
    if (!got.has(id)) {
      throw new Error(`Invalid AI response: missing assignment for note id`);
    }
  }

  for (const id of got) {
    if (!expected.has(id)) {
      throw new Error('Invalid AI response: unexpected recordId in assignments');
    }
  }
}

function buildAutoOrganizeRepairUserSuffix(expectedIds: string[]): string {
  return `\n\n---\nYour previous JSON failed validation. Output one new valid JSON object only.

Fix all issues:
- "folders": 3 to 8 items; each "name" unique; icons and colors must be allowed values.
- "assignments": exactly ${expectedIds.length} objects — one per input note, no duplicates.
- Every "recordId" must be exactly one of these strings (copy verbatim, including case and punctuation):
${JSON.stringify(expectedIds)}
- Every "folderName" in assignments must exactly match a "name" in "folders" (same spelling and casing as in "folders").
- Re-read classifications, summaries, titles, and transcripts; fix any inconsistent or missing assignments.`;
}

function isAutoOrganizeParseFailure(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes('Invalid AI response') || err.message.includes('malformed JSON'))
  );
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

    return JSON.stringify(out);
  } catch {
    return notesJsonPayload;
  }
}

export async function processAutoOrganizeFolders(
  notesJsonPayload: string,
  model: string,
  clientUserAgent?: string | null,
): Promise<AutoOrganizeResult> {
  const compactPayload = compactAutoOrganizeInput(notesJsonPayload);
  let expectedIds = extractExpectedNoteIdsFromCompactPayload(compactPayload);
  if (expectedIds.length === 0) {
    expectedIds = extractExpectedNoteIdsFromCompactPayload(notesJsonPayload);
  }

  const sendOrganize = async (m: string, userContent: string): Promise<AutoOrganizeResult> => {
    const client = createOpenRouterClient(clientUserAgent);
    const response = await client.chat.send({
      chatGenerationParams: {
        model: m,
        messages: [
          { role: 'system', content: AUTO_ORGANIZE_FOLDERS_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        provider: { zdr: true },
        responseFormat: openRouterJsonObjectResponseFormat(),
        temperature: 0.12,
        stream: false,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid AI response: missing content');
    }

    const result = parseAutoOrganizeResult(content);
    assertAutoOrganizeComplete(result, expectedIds);
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
      return await sendOrganize(m, compactPayload + buildAutoOrganizeRepairUserSuffix(expectedIds));
    }
  };

  const models = [model, ...SYSTEM_TASK_MODEL_FALLBACK_CHAIN];
  return withSequentialModelFallback(
    models,
    organizeWithRepair,
    (err) => isRetryableOpenRouterTransportError(err) || isAutoOrganizeParseFailure(err),
  );
}
