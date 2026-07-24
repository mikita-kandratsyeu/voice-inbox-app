import type { MeetingSummaryTemplate } from '@/entities/record';
import type { AiOutputLanguage, SummaryStyle, TaskStrictness } from '@/entities/settings';

import { buildAskInterpretationUserHintBlock } from '../askInterpretationHint';
import { buildLinkedNotesPromptBlock } from '../linkedNotesForPrompt';
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

const LOCAL_OUTPUT_LANGUAGE_HINT_SUMMARY_ONLY: Record<AiOutputLanguage, string> = {
  same: 'Language: write summary, suggestedTitle, every task title, tags, keyPhrases, and nextSteps in the SAME language as the transcript.',
  ru: 'Language: write summary, suggestedTitle, tasks, tags, keyPhrases, and nextSteps in Russian, even if the transcript is not Russian.',
  en: 'Language: write summary, suggestedTitle, tasks, tags, keyPhrases, and nextSteps in English, even if the transcript is not English.',
};

const LOCAL_MEETING_PRESET_HINT = [
  'Preset: meeting.',
  'Treat the transcript as a meeting, call, interview, or sync recap.',
  'classification must be meeting unless the transcript is effectively empty.',
  'summary must read like meeting minutes, not a generic paragraph.',
  'Format summary with section labels localized to the output language: Brief, Decisions, Open questions.',
  'In Russian use: Коротко, Решения, Открытые вопросы.',
  'Each section label must be on its own line with a colon. Put section content on the following line(s), not on the same line as the label. Use "None" / "Нет" when the transcript does not support that section.',
  'Decisions are agreements already made. Open questions are unresolved points. Do not include Tasks or Next steps inside summary; those belong only in tasks[] and nextSteps[].',
  'tasks[] should contain concrete owner/action items only when supported; nextSteps should contain high-level follow-ups that do not duplicate tasks.',
].join(' ');

const LOCAL_MEETING_TEMPLATE_HINT: Record<MeetingSummaryTemplate, string> = {
  general: '',
  standup:
    'Meeting template: Standup. Emphasize done items, next work, blockers, owners, and short decisions.',
  sales_call:
    'Meeting template: Sales call. Emphasize customer needs, objections, buying signals, follow-ups, stakeholders, and next sales steps.',
  one_on_one:
    'Meeting template: 1:1. Emphasize feedback, concerns, goals, commitments, coaching points, and follow-ups.',
  interview:
    'Meeting template: Interview. Emphasize signals, questions, strengths, concerns, and evaluation follow-ups.',
  product_meeting:
    'Meeting template: Product meeting. Emphasize decisions, requirements, user problems, trade-offs, risks, metrics, and next steps.',
  lecture:
    'Meeting template: Lecture. Emphasize key concepts, definitions, examples, open questions, and study items.',
};

export const LOCAL_MEETING_PSEUDO_BASE = [
  'meetingDialogueMarkdown: plain text with line breaks; neutral speaker labels unless names/roles are stated in the transcript.',
  'This is NOT verified audio diarization. Do not invent turns.',
  'If the transcript has enough content, produce at least one turn (single-speaker is allowed: e.g. Speaker 1: ...).',
  'Use empty string only if transcript is too short or unclear.',
].join(' ');

export const LOCAL_MEETING_DIALOGUE_OUTPUT_LANGUAGE_HINT: Record<AiOutputLanguage, string> = {
  same: 'meetingDialogueMarkdown language: same as the transcript for labels and each line after the colon; keep proper names and technical tokens when normally left as-is.',
  ru: 'meetingDialogueMarkdown language: write every line in Russian (labels and spoken content). If the transcript is not Russian, translate faithfully into natural Russian.',
  en: 'meetingDialogueMarkdown language: write every line in English (labels and spoken content). If the transcript is not English, translate faithfully into natural English.',
};

const LOCAL_SUMMARY_SYSTEM_BASE = [
  'You are an expert structured data extractor for voice note transcripts. Your task is to analyze spoken content and extract structured information with high accuracy.',
  'Output format: raw JSON, no markdown, no code fences, no commentary. UTF-8, double-quoted keys; arrays [] when empty.',
  'CRITICAL: Be faithful to the transcript. NEVER invent people, dates, numbers, or commitments not stated in the source.',
  'Required fields: summary, suggestedTitle, tasks[], tags[], classification, keyPhrases[], nextSteps[].',
  'tasks[] structure: {title, priority, deadline}. priority: high (urgent/blocking), medium (important), low (optional/future). deadline: YYYY-MM-DD or ISO datetime YYYY-MM-DDTHH:mm:ss when time stated, or null. Use Reference date ONLY for relative phrases like "tomorrow" or "next Monday". If date unclear, use null.',
  'Task titles MUST start with action verbs and be specific (3-7 words). GOOD: "Send quarterly report to John". BAD: "Do that thing".',
  'classification: personal|work|meeting|idea|other (choose dominant theme).',
  'suggestedTitle: 3-8 words, SPECIFIC. AVOID generic titles like "Voice note" or "Meeting" unless transcript is too short/unclear. Make it scannable.',
  'tags: 2-5 lowercase specific topics (single words or 2-word phrases). NEVER use meta tags like "note", "voice", "recording", "заметка". Focus on WHAT (subject), not HOW (medium).',
  'keyPhrases: 3-8 short entities or key terms (1-5 words each), not full sentences. Names, projects, dates, places, concepts.',
  'nextSteps: 0-3 high-level PREPARATORY follow-ups that SUPPORT tasks, not duplicate them. Think "what to do before/around the main tasks". If no meaningful preparatory actions, use [].',
  'Weak/empty transcript: empty arrays where appropriate, classification "other", minimal generic suggestedTitle in output language.',
  'Follow user message instructions for: language, summary length, task strictness, and any special preset (e.g., meeting format).',
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
  meetingSummaryTemplate?: MeetingSummaryTemplate,
  recordingMarks?: RecordingMarkForPrompt[],
  options?: { includeMeetingDialogueField?: boolean },
): string {
  const isMeeting = processingPreset === 'meeting';
  const includeDialogueField = isMeeting && options?.includeMeetingDialogueField !== false;
  const head = [
    (includeDialogueField ? LOCAL_OUTPUT_LANGUAGE_HINT : LOCAL_OUTPUT_LANGUAGE_HINT_SUMMARY_ONLY)[
      ctx.aiOutputLanguage
    ],
    includeDialogueField
      ? 'Also include meetingDialogueMarkdown in the JSON (see system rules).'
      : '',
    LOCAL_SUMMARY_STYLE_HINT[ctx.summaryStyle],
    LOCAL_TASK_STRICTNESS_HINT[ctx.taskStrictness],
    isMeeting ? LOCAL_MEETING_PRESET_HINT : '',
    isMeeting && meetingSummaryTemplate ? LOCAL_MEETING_TEMPLATE_HINT[meetingSummaryTemplate] : '',
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

  if (request.linkedNotes?.length) {
    blocks.push(buildLinkedNotesPromptBlock(request.linkedNotes));
  }

  const priorTurns = sanitizeAskPriorTurnsForLocal(request.priorTurns);
  if (priorTurns.length > 0) {
    const lines = priorTurns.map((t, i) => `Turn ${i + 1}\nQ: ${t.question}\nA: ${t.answer}`);
    blocks.push(`Prior conversation (same recording):\n${lines.join('\n\n')}`);
  }

  blocks.push(`Question:\n${request.question.trim()}`);
  const interpretationHint = buildAskInterpretationUserHintBlock(request.question);
  if (interpretationHint) {
    blocks.push(interpretationHint.trim());
  }

  return blocks.join('\n\n');
}

export function buildLocalAskSystemPrompt(): string {
  return [
    'You are an AI assistant that answers questions about voice notes with precision and transparency.',
    'Context sources: Transcript (primary), optional Summary, Tasks, Recording pins (timestamped bookmarks), Linked notes (related recordings), Prior conversation (earlier Q&A about same recording).',
    'CRITICAL: Answer ONLY using information present or directly inferable from the provided context. NEVER invent facts (names, dates, numbers, events, quotes).',
    'Answer concisely in the SAME language as the Question. Be DIRECT: answer immediately without preamble. No markdown in answer field.',
    'If context lacks information to answer, state this clearly and briefly.',
    'Interpretations field (0-3 items): Use for CAUTIOUS inferences beyond literal transcript content. Include when question asks about: risks, implications, gaps, contradictions, priorities, conclusions, opinions, meaning, "what suggests", "why might", "consequences". Mark as inferences, NOT facts. Base on CLEAR context clues only. Keep modest and plausible.',
    'When interpretations should be []: purely factual questions like "summarize", "list tasks", "what was said about X", "when is deadline", or when answer is complete with just facts.',
    'answerKind classification: "plain" (prose/general), "list" (enumerated points), "tasks" (action items), "decisions" (choices/agreements).',
    'items field (for list/tasks/decisions): array of short structured strings (1-2 sentences max) mirroring factual answer. Omit for plain or when not adding value.',
    'evidence field (0-5 quotes): SHORT verbatim quotes (prefer 10-30 words, max 60) from context that DIRECTLY support factual answer. Must be actually verbatim, clearly relevant. Include source (transcript|recording_mark|summary|tasks|linked_note|prior_conversation), offsetMs when available (especially transcript), label for recording pins. NEVER invent quotes.',
    'suggestedFollowUps (1-3 questions): Natural next questions about THIS recording (under 15 words each), exploring different aspects. Base on info present in note, not speculation. Avoid duplicating current question.',
    'Output: exactly one JSON object with required "answer" field (plain text string), plus optional answerKind, items, evidence, interpretations, suggestedFollowUps. No extra keys, no markdown in answer.',
  ].join(' ');
}
