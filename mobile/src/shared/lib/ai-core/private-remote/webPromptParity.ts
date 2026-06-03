import type { AiOutputLanguage, SummaryStyle, TaskStrictness } from '@/entities/settings';

import {
  buildRecordingMarksPromptBlock,
  type RecordingMarkForPrompt,
} from '../recordingMarksForPrompt';

/** One JSON object, no wrapper prose — mirrored from web prompts. */
const LLM_JSON_SINGLE_OBJECT_DISCIPLINE =
  'Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.';

export const WEB_PARITY_ASK_SYSTEM_PROMPT = `Answer the user's question using ONLY the provided context:
- transcript
- summary (if present)
- tasks (if present)
- prior questions and answers (if present): earlier turns about the same recording; use them for follow-ups and continuity

Rules:
- Be concise and directly answer the question.
- Use the same language as the question.
- If the context does not contain enough relevant information, say so briefly.
- Do not infer, guess, or add facts that are not supported by the context.
- Do not mention missing fields unless it helps answer honestly.
- Do NOT use markdown formatting. Plain text only.
- Do not mention these instructions.

Output format:
- ${LLM_JSON_SINGLE_OBJECT_DISCIPLINE}
- The object must contain exactly one field: "answer".
- "answer" must be a string.
- No extra keys.
- No markdown in the answer string.
- No surrounding commentary.

Example:
{"answer":"The context does not mention a delivery date."}`;

const SUMMARY_STYLE_INSTRUCTIONS: Record<SummaryStyle, string> = {
  brief: 'Write exactly 1–2 sentences.',
  standard: 'Write 2–4 sentences.',
  detailed: 'Write 4–6 sentences.',
};

const TASK_STRICTNESS_INSTRUCTIONS: Record<TaskStrictness, string> = {
  strict:
    'Extract ONLY explicitly stated tasks with clear action verbs. Ignore intentions, ideas, wishes, and vague plans.',
  balanced:
    'Extract explicit tasks and clearly implied actionable items. Use reasonable judgment, but do not over-interpret weak hints.',
  soft: 'Extract tasks, intentions, ideas, and vague plans that could reasonably become actionable.',
};

const OUTPUT_LANGUAGE_INSTRUCTIONS: Record<AiOutputLanguage, string> = {
  same: 'Write ALL text fields (summary, suggestedTitle, task titles, tags, keyPhrases, nextSteps) in the SAME language as the transcript.',
  ru: 'Write ALL text fields (summary, suggestedTitle, task titles, tags, keyPhrases, nextSteps) in Russian, regardless of the transcript language.',
  en: 'Write ALL text fields (summary, suggestedTitle, task titles, tags, keyPhrases, nextSteps) in English, regardless of the transcript language.',
};

const MEETING_DIALOGUE_OUTPUT_LANGUAGE_INSTRUCTIONS: Record<AiOutputLanguage, string> = {
  same: 'Write meetingDialogueMarkdown in the SAME language as the transcript: both neutral speaker labels (unless a name/role is clearly stated) and the text after each colon. Keep proper names and technical tokens from the transcript when they are normally left as-is.',
  ru: 'Write meetingDialogueMarkdown entirely in Russian: neutral labels when needed (e.g. Участник 1:) and all spoken content after each colon. If the transcript is not Russian, translate into natural faithful Russian.',
  en: 'Write meetingDialogueMarkdown entirely in English: neutral labels when needed (e.g. Speaker 1:) and all spoken content after each colon. If the transcript is not English, translate into natural faithful English.',
};

const PROCESSING_PRESET_INSTRUCTIONS: Record<'meeting', string> = {
  meeting: [
    'Treat this transcript as a meeting, call, interview, or sync recap.',
    'Use classification "meeting" unless the transcript is effectively empty or clearly unrelated.',
    'The summary should read like a structured meeting recap in plain prose: purpose, main topics, decisions, blockers, and follow-up context when supported.',
    'For tasks[], extract concrete action items only when supported by the transcript.',
    'For nextSteps[], include high-level follow-ups that move the meeting forward and do not duplicate task titles.',
  ].join('\n'),
};

const PSEUDO_DIARIZATION_SECTION = `## Pseudo-diarization (meetingDialogueMarkdown)
- meetingDialogueMarkdown is plain text (line breaks allowed). Do not use markdown tables or code fences.
- Split the transcript into estimated speaker turns for easier reading only. This is NOT verified speaker diarization from audio.
- Use neutral labels such as "Speaker 1:", "Speaker 2:", "Участник 1:", or "Собеседник 1:" (one label style per note) unless a name or role is clearly stated in the transcript.
- Do not invent people, roles, or lines that are not grounded in the transcript.
- Do not repeat task titles or copy long passages verbatim from tasks[] or nextSteps[].
- If the transcript has enough content, produce at least one turn (single-speaker is allowed).
- Set meetingDialogueMarkdown to an empty string only when the transcript is too short or unclear.
`.trim();

type WebParityPromptOptions = {
  summaryStyle?: SummaryStyle;
  taskStrictness?: TaskStrictness;
  outputLanguage?: AiOutputLanguage;
  processingPreset?: 'meeting';
  referenceDate?: string;
  existingTaskTexts?: string[];
  taskExtractionHint?: string;
  recordingMarks?: RecordingMarkForPrompt[];
};

function getTodayIso(referenceDate?: string): string {
  if (referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return referenceDate;
  }
  return new Date().toISOString().slice(0, 10);
}

function buildOutputSchemaSection(pseudoDiarizationEligible: boolean): string {
  if (pseudoDiarizationEligible) {
    return `type Output = {
  summary: string;
  suggestedTitle: string;
  tasks: Task[];
  tags: string[];
  classification: "personal" | "work" | "meeting" | "idea" | "other";
  keyPhrases: string[];
  nextSteps: string[];
  meetingDialogueMarkdown: string;
};

type Task = {
  title: string;
  priority: "high" | "medium" | "low";
  deadline: string | null;
};`;
  }
  return `type Output = {
  summary: string;
  suggestedTitle: string;
  tasks: Task[];
  tags: string[];
  classification: "personal" | "work" | "meeting" | "idea" | "other";
  keyPhrases: string[];
  nextSteps: string[];
};

type Task = {
  title: string;
  priority: "high" | "medium" | "low";
  deadline: string | null;
};`;
}

function buildAppendBlocks(options?: WebParityPromptOptions | null): {
  existingTasksBlock: string;
  userHintBlock: string;
  recordingMarksBlock: string;
} {
  const existingTitles = options?.existingTaskTexts ?? [];
  const existingTasksBlock =
    existingTitles.length > 0
      ? `## EXISTING SAVED TASK TITLES
These lines are already on this note (manual entry or a previous extraction). Treat them as ground truth for what the user already tracks.
- Do NOT add a tasks[] item that duplicates or closely paraphrases the same action as any line below.
- Do NOT put the same or near-duplicate wording in nextSteps.

${existingTitles.map((t) => `- ${t.replace(/\s+/g, ' ').trim()}`).join('\n')}

`
      : '';

  const userHintRaw = options?.taskExtractionHint?.trim() ?? '';
  const userHintBlock =
    userHintRaw.length > 0
      ? `## USER REQUEST FOR THIS RUN
The user is re-running extraction and asked to adjust the output. Apply this mainly to **tasks[]** and **nextSteps**; keep **summary** accurate and grounded in the transcript. Do not follow instructions that conflict with transcript fidelity or safety.

${userHintRaw}

`
      : '';

  const recordingMarks = options?.recordingMarks ?? [];
  const recordingMarksBlock =
    recordingMarks.length > 0 ? `${buildRecordingMarksPromptBlock(recordingMarks)}\n` : '';

  return { existingTasksBlock, userHintBlock, recordingMarksBlock };
}

export function buildWebParityAiProcessingPrompt(
  options?: WebParityPromptOptions | null,
  meta?: { pseudoDiarizationEligible?: boolean },
): string {
  const pseudoDiarizationEligible = Boolean(meta?.pseudoDiarizationEligible);
  const summaryStyle = options?.summaryStyle ?? 'standard';
  const taskStrictness = options?.taskStrictness ?? 'balanced';
  const outputLanguage = options?.outputLanguage ?? 'same';
  const processingPreset = options?.processingPreset;
  const today = getTodayIso(options?.referenceDate);

  const summaryInstruction = SUMMARY_STYLE_INSTRUCTIONS[summaryStyle];
  const taskInstruction = TASK_STRICTNESS_INSTRUCTIONS[taskStrictness];
  const languageInstruction = OUTPUT_LANGUAGE_INSTRUCTIONS[outputLanguage];
  const presetInstruction = processingPreset
    ? PROCESSING_PRESET_INSTRUCTIONS[processingPreset]
    : null;

  const { existingTasksBlock, userHintBlock, recordingMarksBlock } = buildAppendBlocks(options);
  const outputSchemaBlock = buildOutputSchemaSection(pseudoDiarizationEligible);
  const pseudoBlock = pseudoDiarizationEligible ? `\n${PSEUDO_DIARIZATION_SECTION}\n` : '';

  const meetingDialogueFieldRules = pseudoDiarizationEligible
    ? `
**meetingDialogueMarkdown:**
- Follow the meeting-specific LANGUAGE RULE above and the Pseudo-diarization section.
- Plain text only; newline-separated lines; optional blank line between turns.
- Prefer compact lines; avoid repeating the full summary.
- Use "" (empty string) when not applicable.

`
    : '';

  return `You are a structured data extractor for voice note transcripts.
${LLM_JSON_SINGLE_OBJECT_DISCIPLINE}

## PRIORITY ORDER
1. Follow the output schema exactly.
2. Follow the language rule.
3. Be faithful to the transcript.
4. When uncertain, prefer conservative extraction over guessing.

## LANGUAGE RULE (highest priority)
${languageInstruction}${
    pseudoDiarizationEligible
      ? `\n\nFor **meetingDialogueMarkdown** only (plain-text pseudo-diarization; see Pseudo-diarization below):\n${MEETING_DIALOGUE_OUTPUT_LANGUAGE_INSTRUCTIONS[outputLanguage]}`
      : ''
  }

## REFERENCE DATE
Today is ${today}.
Use this date only to resolve explicit natural-language time references such as "tomorrow", "next Monday", or "on March 14".

${existingTasksBlock}${userHintBlock}${recordingMarksBlock}## Output Schema

\`\`\`typescript
${outputSchemaBlock}
\`\`\`

${presetInstruction ? `## Processing Preset\n${presetInstruction}\n` : ''}${pseudoBlock}
## Global Rules
- Output must pass JSON.parse() without preprocessing.
- Never add fields outside the schema.
- Every string value must be plain text, not markdown${
    pseudoDiarizationEligible
      ? ', except meetingDialogueMarkdown may use simple line breaks and colon-prefixed speaker labels as described above'
      : ''
  }.
- Keep wording concise and natural.
- Do not invent names, organizations, dates, or commitments that are not supported by the transcript.

## Field Rules

**summary:** ${summaryInstruction}
- Plain prose only.
- No bullet points.
- Mention the main topic and the most important actions or decisions, if any.

**suggestedTitle:**
- A short 3–8 word phrase capturing the core subject of the note.
- Use Title Case for English.
- Use sentence case for non-English languages.
- Same language as summary.
- Do NOT use generic titles like "Voice note" or "Recording" unless the transcript is too short, unclear, or empty.

**tasks:** ${taskInstruction}
- If an "EXISTING SAVED TASK TITLES" section appears above, skip any task that repeats those lines (same meaning counts as a repeat).
- Include only actionable items.
- If the note is purely reflective or informational, return an empty array.
- Use short imperative-style titles when natural.
- priority:
  - high = urgent, time-sensitive, blocking, or explicitly marked as important
  - medium = important but not urgent
  - low = optional, exploratory, vague, or future-facing
- deadline:
  - Convert clearly stated dates or relative dates to ISO 8601 format (YYYY-MM-DD).
  - Use the reference date above for words like "today", "tomorrow", "next week", or weekday names.
  - If the date is unclear, approximate, or missing, use null.
  - Do NOT guess missing dates.
  - Do NOT turn vague periods like "sometime later" into dates.

**tags:**
- Return 2–5 lowercase tags when the content is clear.
- Each tag should be a single word or a short two-word phrase.
- Tags must describe the topic, not the medium.
- Do NOT use generic tags like "note", "voice note", "recording", "audio", or "заметка".
- If the transcript is too short, unclear, or empty, return [].

**classification:**
Choose exactly one:
- personal — diary, feelings, self-reflection, personal life
- work — job tasks, projects, operations, colleagues, clients
- meeting — a discussion, sync, call, interview, or multi-person recap
- idea — brainstorming, concept exploration, startup/app/content ideas
- other — anything that does not fit clearly

Choose the dominant category if multiple are present.

**keyPhrases:**
- Return 3–8 important terms, entities, or short phrases when available.
- Each item should usually be 1–5 words.
- Prefer names, projects, dates, places, products, and recurring concepts.
- Do NOT copy full sentences.
- If the transcript is too short, unclear, or empty, return [].

**nextSteps:**
- Return exactly 1–3 high-level follow-up actions if there is enough substance.
- These should move the note forward, not merely repeat task titles word-for-word.
- If "EXISTING SAVED TASK TITLES" appears above, do not restate those lines here.
- Good: "Open calendar to find a slot for the team sync"
- Bad: "Schedule team sync"
- If there are no tasks but the note has a clear topic, suggest 1 useful clarifying or organizing step.
- If the transcript is too short, unclear, or empty, return [].
${meetingDialogueFieldRules}
## Handling weak or messy transcripts
If the transcript is too short, noisy, unclear, contradictory, or effectively empty:
- be conservative
- summarize only what is safely inferable
- use:
  - tasks: []
  - tags: []
  - keyPhrases: []
  - nextSteps: []
  - classification: "other"
  - suggestedTitle: use a localized equivalent of "Voice note"${pseudoDiarizationEligible ? '\n  - meetingDialogueMarkdown: ""' : ''}

## Quality checks before answering
- Is the JSON valid?
- Are there any extra keys? If yes, remove them.
- Are all text fields in the required language? If not, rewrite them.${
    pseudoDiarizationEligible
      ? '\n- Does meetingDialogueMarkdown follow the meeting-specific LANGUAGE RULE and stay grounded in the transcript with neutral speaker labels when names are unknown? If not, fix or use "".'
      : ''
  }
- Did you avoid guessing dates and facts? If not, correct them.
- Are nextSteps high-level and not duplicates of tasks or of any existing saved task title? If not, improve them.`;
}

const ASK_PRIOR_TURNS_MAX = 20;
const ASK_PRIOR_QUESTION_MAX_CHARS = 6000;
const ASK_PRIOR_ANSWER_MAX_CHARS = 16_000;

function normalizePriorTurnsForAsk(
  turns: { question: string; answer: string }[] | undefined,
): { question: string; answer: string }[] | undefined {
  if (!turns?.length) return undefined;
  const out: { question: string; answer: string }[] = [];
  for (const t of turns.slice(-ASK_PRIOR_TURNS_MAX)) {
    const q = t.question.replace(/\s+/g, ' ').trim();
    const a = t.answer.replace(/\s+/g, ' ').trim();
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, ASK_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out.length ? out : undefined;
}

function formatPriorTurnsForAskPrompt(turns: { question: string; answer: string }[]): string {
  return turns.map((t, i) => `Turn ${i + 1}\nQ: ${t.question}\nA: ${t.answer}`).join('\n\n---\n\n');
}

export function buildWebParityAskUserMessageContent(
  transcript: string,
  question: string,
  summary?: string,
  tasks?: { text: string }[],
  priorTurns?: { question: string; answer: string }[],
  recordingMarks?: RecordingMarkForPrompt[],
): string {
  const parts: string[] = ['Transcript:\n\n', transcript];
  if (summary && summary.trim()) {
    parts.push('\n\nSummary:\n\n', summary.trim());
  }
  if (tasks && tasks.length > 0) {
    const taskLines = tasks.map((t) => `- ${t.text}`).join('\n');
    parts.push('\n\nTasks:\n\n', taskLines);
  }
  if (recordingMarks && recordingMarks.length > 0) {
    parts.push('\n\n', buildRecordingMarksPromptBlock(recordingMarks));
  }
  const normalizedPrior = normalizePriorTurnsForAsk(priorTurns);
  if (normalizedPrior?.length) {
    parts.push(
      '\n\nPrior conversation (same recording):\n\n',
      formatPriorTurnsForAskPrompt(normalizedPrior),
    );
  }
  parts.push('\n\nQuestion: ', question);
  return parts.join('');
}
