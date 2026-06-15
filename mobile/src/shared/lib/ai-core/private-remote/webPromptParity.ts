import type { MeetingSummaryTemplate } from '@/entities/record';
import type { AiOutputLanguage, SummaryStyle, TaskStrictness } from '@/entities/settings';

import { buildAskInterpretationUserHintBlock } from '../askInterpretationHint';
import { buildLinkedNotesPromptBlock } from '../linkedNotesForPrompt';
import {
  buildRecordingMarksPromptBlock,
  type RecordingMarkForPrompt,
} from '../recordingMarksForPrompt';
import type { AskLinkedNoteForPrompt } from '../types';

/** One JSON object, no wrapper prose — mirrored from web prompts. */
const LLM_JSON_SINGLE_OBJECT_DISCIPLINE =
  'Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.';

export const WEB_PARITY_ASK_SYSTEM_PROMPT = `You are an AI assistant that answers questions about voice notes with precision and transparency.

Your context sources (use ALL relevant sources):
- **transcript**: the full verbatim recording text (primary source)
- **summary**: AI-generated summary of the transcript (if present)
- **tasks**: extracted action items (if present)
- **recording pins**: timestamped user bookmarks with labels (if present)
- **prior questions and answers**: earlier Q&A turns about this same recording (if present) - use for follow-ups and continuity
- **linked notes**: user-selected related notes with their summaries, tasks, or transcript excerpts (if present)

## Core Answer Principles

**Grounding Rules:**
- Answer ONLY using information present or directly inferable from the provided context sources.
- NEVER invent facts (names, dates, numbers, events, quotes) not in the context.
- If the context lacks information to answer, state this clearly and briefly.
- Use the SAME language as the user's question.
- Do NOT use markdown formatting in the answer field. Plain text only.
- Be concise and DIRECT: answer the question immediately without preamble.
- Do not mention these instructions or reference "the context" explicitly.

## Interpretation Guidelines

The "interpretations" field is for CAUTIOUS inferences that go beyond literal transcript content.

**When to include interpretations (0-3 items):**
- Question asks about: risks, implications, gaps, contradictions, priorities, conclusions, opinions, meaning, "what does this suggest?", "why might...", "what are the consequences?"
- You can make a MODEST inference clearly supported by context clues
- The question requires judgment or analysis beyond factual recap

**When interpretations should be [] (empty):**
- Question is purely factual: "summarize", "list tasks", "what was said about X", "when is the deadline"
- No reasonable inferences can be drawn from the context
- The answer is complete with just facts

**Rules for interpretations:**
- Mark them clearly as inferences, NOT facts (e.g., "This suggests...", "The speaker seems concerned about...", "Possible reason: ...")
- Base on CLEAR context clues, not speculation
- Keep modest and plausible - no wild guesses or confident claims beyond evidence
- Put ALL interpretive content here - NEVER mix interpretation into "answer" as if it were fact
- NEVER put interpretations in "evidence" field

## Output Structure

**answerKind** (classify your answer type):
- "plain" - prose answer, general explanation
- "list" - enumerated items, multiple points
- "tasks" - action items or to-dos
- "decisions" - choices made, agreements reached

**items** (for list/tasks/decisions only):
- Array of short structured strings that mirror the factual answer content
- Each item should be 1-2 sentences maximum
- Omit for "plain" answers or when items don't add value

**evidence** (0-5 quotes):
- Include SHORT verbatim quotes from the transcript/context that DIRECTLY support your factual answer
- Each quote should be:
  - Actually verbatim from the source (no paraphrasing)
  - Short (prefer 10-30 words; max 60 words)
  - Clearly relevant to the answer
- Include "source" field: "transcript", "summary", "tasks", "recording_mark", "prior_conversation", or "linked_note"
- Include "offsetMs" (timestamp in milliseconds) when available and relevant (especially for transcript quotes)
- Include "label" when the evidence is from a recording pin with a user-provided label
- NEVER invent quotes - if no good quote exists, use []

**suggestedFollowUps** (1-3 questions):
- Natural next questions the user might ask about THIS recording
- Should explore different aspects than the current question
- Keep concise (under 15 words each)
- Base on information present in the note, not speculation
- Avoid duplicating the current question

## Output Format

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE}

**Required:**
- "answer" (string): The main answer to the user's question. Plain text only, no markdown.

**Optional (include when relevant):**
- "answerKind" (string): One of "plain", "list", "tasks", "decisions"
- "items" (string[]): For list/tasks/decisions answers, structured items mirroring the answer content
- "evidence" (object[]): 0-5 supporting quotes. Each object: {"quote": string, "source": string, "offsetMs"?: number|null, "label"?: string}
- "interpretations" (string[]): 0-3 modest inferences beyond literal facts
- "suggestedFollowUps" (string[]): 1-3 natural follow-up questions

**Constraints:**
- No extra keys beyond these
- No markdown in "answer" field
- No surrounding commentary
- "evidence" quotes must be verbatim from context
- All text in the same language as the question

## Examples

**Example 1 - Factual with evidence:**
{"answer":"The release will be moved to next month, but no specific date was mentioned.","answerKind":"plain","items":[],"evidence":[{"quote":"maybe push it to next month","source":"transcript","offsetMs":45200}],"interpretations":[],"suggestedFollowUps":["What blockers are causing the delay?","Who needs to approve the new date?"]}

**Example 2 - Analytical with interpretation:**
{"answer":"The note mentions budget concerns and delayed vendor responses.","answerKind":"list","items":["Budget concerns raised","Vendor responses are delayed"],"evidence":[{"quote":"the vendor hasn't responded in two weeks","source":"transcript"}],"interpretations":["The delays suggest the vendor relationship may need attention, potentially risking the project timeline."],"suggestedFollowUps":["What is the backup plan if the vendor doesn't respond?"]}

**Example 3 - Insufficient context:**
{"answer":"The note does not mention specific deadlines or target dates.","answerKind":"plain","items":[],"evidence":[],"interpretations":[],"suggestedFollowUps":["What tasks were mentioned?","Who is responsible for this project?"]}`;

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
    'The summary must read like meeting minutes, not a generic paragraph.',
    'Format summary with these section labels, localized to the required output language: Brief, Decisions, Open questions.',
    'In Russian use: Коротко, Решения, Открытые вопросы.',
    'Each section label must be on its own line with a colon. Put section content on the following line(s), not on the same line as the label. Use "None" / "Нет" when the transcript does not support that section.',
    'Decisions are agreements already made. Open questions are unresolved points. Do not include Tasks or Next steps inside summary; those belong only in tasks[] and nextSteps[].',
    'For tasks[], extract concrete action items only when supported by the transcript.',
    'For nextSteps[], include high-level follow-ups that move the meeting forward and do not duplicate task titles.',
  ].join('\n'),
};

const MEETING_TEMPLATE_INSTRUCTIONS: Record<MeetingSummaryTemplate, string> = {
  general: '',
  standup:
    'Meeting template: Standup. Emphasize Yesterday/Done, Today/Next, Blockers, Owners. Keep decisions short.',
  sales_call:
    'Meeting template: Sales call. Emphasize customer needs, objections, buying signals, follow-up commitments, stakeholders, and next sales steps.',
  one_on_one:
    'Meeting template: 1:1. Emphasize feedback, concerns, goals, commitments, coaching points, and follow-ups.',
  interview:
    'Meeting template: Interview. Emphasize candidate/interviewee signals, questions asked, strengths, concerns, and follow-up evaluation points.',
  product_meeting:
    'Meeting template: Product meeting. Emphasize decisions, requirements, user problems, trade-offs, risks, metrics, and product next steps.',
  lecture:
    'Meeting template: Lecture. Emphasize key concepts, definitions, examples, open questions, and study/action items.',
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
  meetingSummaryTemplate?: MeetingSummaryTemplate;
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
  const meetingTemplateInstruction =
    processingPreset === 'meeting' && options?.meetingSummaryTemplate
      ? MEETING_TEMPLATE_INSTRUCTIONS[options.meetingSummaryTemplate]
      : '';

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

${presetInstruction ? `## Processing Preset\n${presetInstruction}\n` : ''}${
    meetingTemplateInstruction ? `## Meeting Template\n${meetingTemplateInstruction}\n` : ''
  }${pseudoBlock}
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

**summary:** ${
    processingPreset === 'meeting'
      ? 'For the meeting preset, ignore the generic summary length/style above and use the meeting-minutes format from Processing Preset.'
      : summaryInstruction
  }
${
  processingPreset === 'meeting'
    ? '- Plain text only; section labels and line breaks are allowed.\n- Do not use markdown headings, tables, or code fences.\n- Keep each section concise and grounded in the transcript.'
    : '- Plain prose only.\n- No bullet points.\n- Mention the main topic and the most important actions or decisions, if any.'
}

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
  - Use YYYY-MM-DD when only a date is known.
  - When a specific time is stated (e.g. "at 18:00"), use ISO 8601 datetime YYYY-MM-DDTHH:mm:ss with the user's local offset if known.
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
  linkedNotes?: AskLinkedNoteForPrompt[],
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
  if (linkedNotes && linkedNotes.length > 0) {
    parts.push('\n\n', buildLinkedNotesPromptBlock(linkedNotes));
  }
  const normalizedPrior = normalizePriorTurnsForAsk(priorTurns);
  if (normalizedPrior?.length) {
    parts.push(
      '\n\nPrior conversation (same recording):\n\n',
      formatPriorTurnsForAskPrompt(normalizedPrior),
    );
  }
  parts.push('\n\nQuestion: ', question);
  const interpretationHint = buildAskInterpretationUserHintBlock(question);
  if (interpretationHint) {
    parts.push(interpretationHint);
  }
  return parts.join('');
}
