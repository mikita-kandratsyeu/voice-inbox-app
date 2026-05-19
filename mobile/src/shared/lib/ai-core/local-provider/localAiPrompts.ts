import type { AiOutputLanguage, SummaryStyle, TaskStrictness } from '@/entities/settings';

import {
  buildRecordingMarksPromptBlock,
  type RecordingMarkForPrompt,
} from '../recordingMarksForPrompt';
import type { AiExecutionContext, AskPriorTurn, AskRequest } from '../types';
import {
  LOCAL_ASK_MAX_TASK_ITEMS,
  LOCAL_ASK_PRIOR_ANSWER_MAX_CHARS,
  LOCAL_ASK_PRIOR_QUESTION_MAX_CHARS,
  LOCAL_ASK_PRIOR_TURNS_MAX,
  LOCAL_ASK_SUMMARY_MAX_CHARS,
  TASK_EXTRACTION_HINT_MAX_CHARS,
} from './localAiConstants';

const LOCAL_SUMMARY_STYLE_HINT: Record<SummaryStyle, string> = {
  brief: 'Summary length: 2–3 short sentences. Prose only, no bullet lists.',
  standard: 'Summary length: 3–5 sentences. Prose only, no bullet lists.',
  detailed: 'Summary length: about 5–8 sentences. Prose only, no bullet lists.',
};

const LOCAL_TASK_STRICTNESS_HINT: Record<TaskStrictness, string> = {
  strict:
    'tasks: only clear, explicit actions. Skip vague wishes, ideas without a concrete next step.',
  balanced:
    'tasks: explicit actions plus clearly implied ones. Do not invent obligations not supported by the transcript.',
  soft: 'tasks: include reasonable intentions and plans that could become actionable.',
};

const LOCAL_OUTPUT_LANGUAGE_HINT: Record<AiOutputLanguage, string> = {
  same: 'Language: write summary, suggestedTitle, every task title, tags, keyPhrases, nextSteps, and meetingDialogueMarkdown (if present) in the SAME language as the transcript.',
  ru: 'Language: write ALL of those text fields (including meetingDialogueMarkdown when present) in Russian, even if the transcript is not Russian.',
  en: 'Language: write ALL of those text fields (including meetingDialogueMarkdown when present) in English, even if the transcript is not English.',
};

const LOCAL_MEETING_PRESET_HINT = [
  'Preset: meeting.',
  'Treat the transcript as a meeting, call, interview, or sync recap.',
  'classification must be meeting unless the transcript is effectively empty.',
  'Summary should read like a structured meeting recap in prose: purpose, main topics, decisions, blockers, and follow-up context when supported.',
  'tasks[] should contain concrete owner/action items only when supported; nextSteps should contain high-level follow-ups that do not duplicate tasks.',
].join(' ');

const LOCAL_MEETING_PSEUDO_BASE = [
  'meetingDialogueMarkdown: plain text with line breaks; neutral speaker labels unless names/roles are stated in the transcript.',
  'This is NOT verified audio diarization. Do not invent turns. Use empty string if single-speaker, too short, or unclear.',
].join(' ');

const LOCAL_MEETING_DIALOGUE_OUTPUT_LANGUAGE_HINT: Record<AiOutputLanguage, string> = {
  same: 'meetingDialogueMarkdown language: same as the transcript for labels and each line after the colon; keep proper names and technical tokens when normally left as-is.',
  ru: 'meetingDialogueMarkdown language: write every line in Russian (labels and spoken content). If the transcript is not Russian, translate faithfully into natural Russian.',
  en: 'meetingDialogueMarkdown language: write every line in English (labels and spoken content). If the transcript is not English, translate faithfully into natural English.',
};

const LOCAL_SUMMARY_SYSTEM_BASE = [
  'From the transcript, output one JSON object only: raw JSON, no markdown, no code fences, no commentary.',
  'UTF-8, double-quoted keys; arrays [] when empty. Plain text in strings. Follow the user message for language, summary length, and task strictness.',
  'Stay faithful; do not invent people, dates, or commitments.',
  'Fields: summary, suggestedTitle, tasks[], tags[], classification, keyPhrases[], nextSteps[].',
  'tasks[] items: {title, priority, deadline}. priority: high|medium|low. deadline: YYYY-MM-DD or null — use Reference date only for relative phrases; if unsure, null.',
  'classification: personal|work|meeting|idea|other (dominant theme).',
  'suggestedTitle: ~3–8 words, specific; generic title only if content is empty or unusable.',
  'tags: 2–5 lowercase topics; not note/voice/recording/заметка. keyPhrases: 3–8 short entities (not sentences). nextSteps: 0–3 follow-ups; do not copy task titles or lines listed under existing saved tasks.',
  'Weak/empty transcript: empty arrays where listed, classification other, minimal generic suggestedTitle in output language.',
].join(' ');

export function buildLocalSummarySystemPrompt(
  referenceDate: string,
  opts?: { includePseudoDiarization?: boolean; aiOutputLanguage?: AiOutputLanguage },
): string {
  const pseudo = Boolean(opts?.includePseudoDiarization);
  const lang = opts?.aiOutputLanguage ?? 'same';
  const extra = pseudo
    ? ` meetingDialogueMarkdown must be a string (same JSON object). ${LOCAL_MEETING_PSEUDO_BASE} ${LOCAL_MEETING_DIALOGUE_OUTPUT_LANGUAGE_HINT[lang]}`
    : '';
  return `${LOCAL_SUMMARY_SYSTEM_BASE}${extra} Reference date (for deadlines only): ${referenceDate}.`;
}

export function buildLocalSummaryUserContent(
  transcriptText: string,
  ctx: AiExecutionContext,
  existingTaskTitles?: string[],
  taskExtractionHint?: string,
  processingPreset?: 'meeting',
  recordingMarks?: RecordingMarkForPrompt[],
): string {
  const head = [
    LOCAL_OUTPUT_LANGUAGE_HINT[ctx.aiOutputLanguage],
    processingPreset === 'meeting'
      ? 'Also include meetingDialogueMarkdown in the JSON (see system rules).'
      : '',
    LOCAL_SUMMARY_STYLE_HINT[ctx.summaryStyle],
    LOCAL_TASK_STRICTNESS_HINT[ctx.taskStrictness],
    processingPreset === 'meeting' ? LOCAL_MEETING_PRESET_HINT : '',
  ]
    .filter(Boolean)
    .join('\n');

  const existingBlock = existingTaskTitles?.length
    ? [
        '',
        'Existing saved tasks (do not duplicate or closely paraphrase in tasks[] or nextSteps):',
        ...existingTaskTitles.map((t) => `- ${t.replace(/\s+/g, ' ').trim()}`),
      ].join('\n')
    : '';

  const rawHint = (taskExtractionHint ?? '').split('\0').join('').trim();
  const clippedHint =
    rawHint.length > TASK_EXTRACTION_HINT_MAX_CHARS
      ? rawHint.slice(0, TASK_EXTRACTION_HINT_MAX_CHARS)
      : rawHint;
  const hintBlock =
    clippedHint.length > 0
      ? [
          '',
          'User request for this extraction run (apply mainly to tasks[] and nextSteps; keep summary faithful to the transcript):',
          clippedHint,
        ].join('\n')
      : '';

  const marksBlock =
    recordingMarks && recordingMarks.length > 0
      ? ['', buildRecordingMarksPromptBlock(recordingMarks)].join('\n')
      : '';

  return [head, existingBlock, hintBlock, marksBlock, '', 'Transcript:', transcriptText].join('\n');
}

export function sanitizeAskPriorTurnsForLocal(turns: AskPriorTurn[] | undefined): AskPriorTurn[] {
  if (!turns?.length) return [];
  const out: AskPriorTurn[] = [];
  const slice = turns.slice(-LOCAL_ASK_PRIOR_TURNS_MAX);
  for (const t of slice) {
    const q = t.question.replace(/\s+/g, ' ').trim();
    const a = t.answer.replace(/\s+/g, ' ').trim();
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, LOCAL_ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, LOCAL_ASK_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out;
}

export function buildLocalAskUserContent(request: AskRequest, transcript: string): string {
  const blocks: string[] = [`Transcript:\n${transcript}`];
  const summary = request.summary?.trim();

  if (summary) {
    blocks.push(`Summary:\n${summary.slice(0, LOCAL_ASK_SUMMARY_MAX_CHARS)}`);
  }

  const tasks = request.tasks?.filter((t) => t.text.trim()) ?? [];

  if (tasks.length > 0) {
    const lines = tasks.slice(0, LOCAL_ASK_MAX_TASK_ITEMS).map((t) => `- ${t.text.trim()}`);
    blocks.push(`Tasks:\n${lines.join('\n')}`);
  }

  if (request.recordingMarks?.length) {
    blocks.push(buildRecordingMarksPromptBlock(request.recordingMarks));
  }

  const priorTurns = sanitizeAskPriorTurnsForLocal(request.priorTurns);
  if (priorTurns.length > 0) {
    const lines = priorTurns.map((t, i) => `Turn ${i + 1}\nQ: ${t.question}\nA: ${t.answer}`);
    blocks.push(`Prior conversation (same recording):\n${lines.join('\n\n')}`);
  }

  blocks.push(`Question:\n${request.question.trim()}`);

  return blocks.join('\n\n');
}

export function buildLocalAskSystemPrompt(): string {
  return [
    'Use ONLY the provided blocks (Transcript; optional Summary, Tasks, Recording pins, Prior conversation; and the current Question).',
    'Prior conversation is earlier Q&A about the same transcript; use it for follow-ups and continuity.',
    'Answer concisely in the SAME language as the current Question.',
    'If the context does not support an answer, say so in one short sentence. Do not invent facts.',
    'No markdown. Return exactly one JSON object: {"answer":"your plain text here"}. No other keys.',
    'The answer value must be plain text only (no nested JSON, no code fences).',
  ].join(' ');
}
