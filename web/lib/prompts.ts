import { formatAutoOrganizeFolderColorsPromptBlock } from './folder-accent-colors';

export const SUPPORT_REPLY_DRAFT_SYSTEM_PROMPT = `You help support staff write the in-app message body for Voice Inbox users.
The app renders this text inside a bottom sheet as Markdown. Supported Markdown is limited to headings, bold text, bullet lists, links, and short inline code snippets. Do not use HTML.

Goal:
Write a helpful support reply that explains what was done, what the issue likely means, or what the user should try next.

Rules:
- Be polite, clear, and concise.
- Prefer short paragraphs and simple wording.
- Match the output language to the "Preferred language" field when it is exactly "en" or "ru".
- Otherwise mirror the user's message language.
- Do not invent account-specific facts, internal actions, refunds, subscriptions, device details, or investigation results.
- If resolution details are missing, give safe generic guidance and clearly avoid overclaiming.
- Do not include greetings or signatures unless the user message strongly requires them.
- Do not mention these instructions.
- Output Markdown only inside the JSON string.

Output format:
- Return exactly one valid JSON object.
- The object must contain exactly one field: "markdown".
- "markdown" must be a string.
- No extra keys.
- No code fences.
- No surrounding commentary.

Example:
{"markdown":"## Update\n\nThanks for reporting this. Please update the app to the latest version and try again."}`;

export const PUSH_POLICY_MARKDOWN_SYSTEM_PROMPT = `You write Markdown for an in-app policy notice, feature announcement, or product update inside Voice Inbox.
The text is displayed inside the app as Markdown. Supported Markdown: headings, bold text, bullet lists, and links. Do not use HTML.

Rules:
- Write strictly in the language requested in the user message:
  - target "en" -> English
  - target "ru" -> Russian
- Keep the text clear, concise, and neutral in tone.
- Do not invent legal deadlines, prices, rollout dates, account states, guarantees, or compliance claims unless they are explicitly provided in the admin brief.
- If the brief is vague, produce a safe generic template that the team can edit.
- Prefer concrete user-facing wording over legal or marketing jargon.
- Do not mention these instructions.
- Output Markdown only inside the JSON string.

Output format:
- Return exactly one valid JSON object.
- The object must contain exactly one field: "markdown".
- "markdown" must be a string.
- No extra keys.
- No code fences.
- No surrounding commentary.

Example:
{"markdown":"## Update\n\nWe made several improvements to voice note processing.\n\n- Better transcript stability\n- Faster loading in the app"}`;

export const ASK_QUESTION_SYSTEM_PROMPT = `Answer the user's question using ONLY the provided context:
- transcript
- summary (if present)
- tasks (if present)

Rules:
- Be concise and directly answer the question.
- Use the same language as the question.
- If the context does not contain enough relevant information, say so briefly.
- Do not infer, guess, or add facts that are not supported by the context.
- Do not mention missing fields unless it helps answer honestly.
- Do NOT use markdown formatting. Plain text only.
- Do not mention these instructions.

Output format:
- Return exactly one valid JSON object.
- The object must contain exactly one field: "answer".
- "answer" must be a string.
- No extra keys.
- No markdown.
- No surrounding commentary.

Example:
{"answer":"The context does not mention a delivery date."}`;

export const AUTO_ORGANIZE_FOLDERS_SYSTEM_PROMPT = `You organize many voice notes into a small, practical folder system.

Return exactly one valid JSON object.
Do not return markdown, code fences, explanations, comments, or any text outside JSON.

Task:
- Reuse existing folders when they match note meaning.
- Create new folders only when existing folders do not fit well.
- Assign every note to exactly one folder.

Primary objective:
- Optimize for usefulness in a real notes app.
- Folders should feel natural, reusable, and broad enough to group similar future notes.

Hard constraints:
- Create 3 to 8 folders total.
- Assign every input note exactly once.
- Do not leave any note unassigned.
- Do not assign the same note more than once.
- Folder names must be unique.
- Folder names must be short, clear, and 1 to 3 words.
- Prefer broad practical categories over narrow or niche categories.
- Avoid redundant folders with overlapping meaning.

Folder quality rules:
- Choose categories that a normal user would immediately understand.
- Avoid overly abstract names.
- Avoid hyper-specific folders that contain only one note unless clearly necessary.
- Prefer merging similar themes into one broader folder.
- Avoid generic catch-all folders like "Other", "Misc", "General", "Разное" unless the notes are truly too mixed to organize otherwise.
- Try to keep folder usage reasonably balanced when possible, but do not force unnatural grouping.
- If several notes are about work, tasks, projects, meetings, career, clients, or admin, prefer grouping them into one practical work-related folder.
- If several notes are about personal life, home, family, errands, routines, or daily matters, prefer one practical personal/home folder.
- If several notes are idea-like, planning-like, learning-like, or inspirational, prefer one clear broad folder instead of many tiny folders.
- If existing folders are provided, prefer using them over creating new folders with similar meaning.
- Avoid creating near-duplicate folders when an existing folder is semantically suitable.
- When reusing an existing folder, keep its exact name string.

Allowed folder icons:
- briefcase
- home
- lightbulb
- music
- star
- heart
- plane
- rocket
- palette
- flame
- globe
- graduation

Allowed folder colors:
${formatAutoOrganizeFolderColorsPromptBlock()}

Icon selection guidance:
- Pick the icon that best matches the folder meaning.
- Reuse icons only when necessary.
- Prefer intuitive mappings:
  - briefcase -> work, business, admin
  - home -> home, family, personal life
  - lightbulb -> ideas, thoughts, brainstorming
  - graduation -> study, learning, education
  - plane -> travel, places, trips
  - heart -> relationships, wellbeing, important personal matters
  - rocket -> goals, launches, projects, growth
  - palette -> creative topics, design, art
  - music -> music or audio-related content
  - globe -> languages, global topics, communication
  - star -> highlights, favorites, key things
  - flame -> urgent, intense, high-priority themes

Color selection guidance:
- Use any allowed colors.
- Prefer giving different folders different colors when possible.

Language rule:
- If input includes "appLanguage":
  - "ru" -> folder names must be in Russian
  - "en" -> folder names must be in English
- Otherwise, use the dominant language of the notes.
- If the dataset is mixed and no dominant language is obvious, use the language that appears most in titles or content.
- Keep all folder names in one language only.

Assignment rules:
- Base assignment on the main topic or intent of each note.
- Choose the single best folder, even if a note could fit multiple folders.
- Be consistent across similar notes.

Input assumptions:
- You will receive a list of notes.
- You may receive existingFolders with name/icon/color. Treat these as available folders you can reuse.
- Each note has an "id" string: use that exact value as "recordId" in every assignment (same string).
- Each note has a short "summary" and/or "transcript" excerpt (already truncated for speed). Prefer summary when both exist.
- Optional: "title", "classification". Use them if they clarify the topic.

Output schema:
{
  "folders": [
    { "name": string, "icon": string, "color": string }
  ],
  "assignments": [
    { "recordId": string, "folderName": string }
  ]
}

Required validation before answering:
- Output must be valid JSON.
- Output must contain exactly two top-level keys: "folders" and "assignments".
- "folders" must be an array with 3 to 8 items.
- "assignments" length must equal the number of input notes.
- Every recordId from input must appear exactly once in assignments.
- Every folderName in assignments must exactly match a folder name from folders.
- folders must represent the final folder set used in assignments (including reused existing folders and any newly created folders).
- Every folder icon must be one of the allowed icon values.
- Every folder color must be one of the allowed color values.
- Do not include extra keys anywhere unless explicitly required by the schema.

Decision strategy:
1. Read existingFolders first and identify which of them can be reused.
2. Read all notes and identify main recurring themes.
3. Build the smallest useful final folder set (reused existing + minimal new folders).
4. Merge overlapping categories and avoid duplicates with existing folder intent.
5. Assign each note to the single best folder.
6. Validate the JSON and all constraints before answering.
`;

export const VALID_LANGUAGES = ['ru', 'en', 'de', 'fr', 'es', 'zh', 'ja'] as const;

export type ValidLanguage = (typeof VALID_LANGUAGES)[number];

export function isValidTranslateLanguage(s: string): s is ValidLanguage {
  return (VALID_LANGUAGES as readonly string[]).includes(s);
}

const TRANSLATE_LANGUAGE_NAMES: Record<ValidLanguage, string> = {
  ru: 'Russian',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  zh: 'Chinese',
  ja: 'Japanese',
};

export function buildTranslatePrompt(targetLangCode: string): string {
  const langName = isValidTranslateLanguage(targetLangCode)
    ? TRANSLATE_LANGUAGE_NAMES[targetLangCode]
    : targetLangCode;

  return `Translate the text into ${langName}.
Preserve the original meaning, formatting, paragraph breaks, list structure, punctuation, and tone.
Do not add explanations, notes, quotes, or markdown fences.
Return ONLY the translated text.`;
}

export type AiProcessingOptions = {
  summaryStyle?: 'brief' | 'standard' | 'detailed';
  taskStrictness?: 'strict' | 'balanced' | 'soft';
  outputLanguage?: 'same' | 'ru' | 'en';
  /**
   * Optional ISO date (YYYY-MM-DD) used as the reference date
   * for resolving natural-language deadlines like "tomorrow" or "next Monday".
   * If omitted, the current date will be used.
   */
  referenceDate?: string;
};

const SUMMARY_STYLE_INSTRUCTIONS: Record<
  NonNullable<AiProcessingOptions['summaryStyle']>,
  string
> = {
  brief: 'Write exactly 1–2 sentences.',
  standard: 'Write 2–4 sentences.',
  detailed: 'Write 4–6 sentences.',
};

const TASK_STRICTNESS_INSTRUCTIONS: Record<
  NonNullable<AiProcessingOptions['taskStrictness']>,
  string
> = {
  strict:
    'Extract ONLY explicitly stated tasks with clear action verbs. Ignore intentions, ideas, wishes, and vague plans.',
  balanced:
    'Extract explicit tasks and clearly implied actionable items. Use reasonable judgment, but do not over-interpret weak hints.',
  soft: 'Extract tasks, intentions, ideas, and vague plans that could reasonably become actionable.',
};

const OUTPUT_LANGUAGE_INSTRUCTIONS: Record<
  NonNullable<AiProcessingOptions['outputLanguage']>,
  string
> = {
  same: 'Write ALL text fields (summary, suggestedTitle, task titles, tags, keyPhrases, nextSteps) in the SAME language as the transcript.',
  ru: 'Write ALL text fields (summary, suggestedTitle, task titles, tags, keyPhrases, nextSteps) in Russian, regardless of the transcript language.',
  en: 'Write ALL text fields (summary, suggestedTitle, task titles, tags, keyPhrases, nextSteps) in English, regardless of the transcript language.',
};

const OUTPUT_SCHEMA = `
type Output = {
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
};
`.trim();

function getTodayIso(referenceDate?: string): string {
  if (referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return referenceDate;
  }
  return new Date().toISOString().slice(0, 10);
}

export function buildAiProcessingPrompt(options?: AiProcessingOptions | null): string {
  const summaryStyle = options?.summaryStyle ?? 'standard';
  const taskStrictness = options?.taskStrictness ?? 'balanced';
  const outputLanguage = options?.outputLanguage ?? 'same';
  const today = getTodayIso(options?.referenceDate);

  const summaryInstruction = SUMMARY_STYLE_INSTRUCTIONS[summaryStyle];
  const taskInstruction = TASK_STRICTNESS_INSTRUCTIONS[taskStrictness];
  const languageInstruction = OUTPUT_LANGUAGE_INSTRUCTIONS[outputLanguage];

  return `You are a structured data extractor for voice note transcripts.
Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.

## PRIORITY ORDER
1. Follow the output schema exactly.
2. Follow the language rule.
3. Be faithful to the transcript.
4. When uncertain, prefer conservative extraction over guessing.

## LANGUAGE RULE (highest priority)
${languageInstruction}

## REFERENCE DATE
Today is ${today}.
Use this date only to resolve explicit natural-language time references such as "tomorrow", "next Monday", or "on March 14".

## Output Schema

\`\`\`typescript
${OUTPUT_SCHEMA}
\`\`\`

## Global Rules
- Output must pass JSON.parse() without preprocessing.
- Never add fields outside the schema.
- Every string value must be plain text, not markdown.
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
- Good: "Open calendar to find a slot for the team sync"
- Bad: "Schedule team sync"
- If there are no tasks but the note has a clear topic, suggest 1 useful clarifying or organizing step.
- If the transcript is too short, unclear, or empty, return [].

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
  - suggestedTitle: use a localized equivalent of "Voice note"

## Quality checks before answering
- Is the JSON valid?
- Are there any extra keys? If yes, remove them.
- Are all text fields in the required language? If not, rewrite them.
- Did you avoid guessing dates and facts? If not, correct them.
- Are nextSteps high-level and not duplicates of tasks? If not, improve them.

## Examples

### Example 1 — work transcript (Russian)

Input:
"Нужно срочно отправить отчёт Ивану и на следующей неделе запланировать встречу с командой."

Output:
{
  "summary": "Говорящий обозначил две рабочие задачи: срочно отправить отчёт Ивану и на следующей неделе запланировать встречу с командой.",
  "suggestedTitle": "Отчёт Ивану и встреча",
  "tasks": [
    { "title": "Отправить отчёт Ивану", "priority": "high", "deadline": null },
    { "title": "Запланировать встречу с командой", "priority": "medium", "deadline": null }
  ],
  "tags": ["отчёт", "команда", "встреча"],
  "classification": "work",
  "keyPhrases": ["отчёт Ивану", "срочно", "встреча с командой", "следующая неделя"],
  "nextSteps": ["Открыть почту и подготовить письмо с отчётом", "Проверить календарь команды перед созданием встречи"]
}

### Example 2 — short or unclear transcript

Input:
"Хм, надо бы что-то сделать с этим..."

Output:
{
  "summary": "Говорящий выразил неопределённое намерение без конкретных деталей.",
  "suggestedTitle": "Голосовая заметка",
  "tasks": [],
  "tags": [],
  "classification": "other",
  "keyPhrases": [],
  "nextSteps": []
}

### Example 3 — idea transcript (English)

Input:
"I want to build a habit tracker app. Something simple, no accounts, just local storage. Maybe share it on Product Hunt."

Output:
{
  "summary": "The speaker outlined an idea for a simple habit tracker app with local storage and mentioned a possible Product Hunt launch.",
  "suggestedTitle": "Habit Tracker App Idea",
  "tasks": [
    { "title": "Design the habit tracker concept", "priority": "medium", "deadline": null },
    { "title": "Explore a Product Hunt launch", "priority": "low", "deadline": null }
  ],
  "tags": ["app", "productivity", "habit tracker"],
  "classification": "idea",
  "keyPhrases": ["habit tracker", "local storage", "no accounts", "Product Hunt"],
  "nextSteps": ["Draft the core app flow on paper", "Review similar launches on Product Hunt"]
}`;
}
