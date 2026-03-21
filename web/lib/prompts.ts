export const SUPPORT_REPLY_DRAFT_SYSTEM_PROMPT = `You help support staff write the in-app message body for Voice Inbox users.
The app shows this text inside a bottom sheet as Markdown (headings, bold, lists, links, short code snippets are OK).

Rules:
- Be polite, clear, and concise.
- Explain what was done or what the user should try next.
- Match the output language to the "Preferred language" field when it is en or ru; otherwise mirror the user's message language.
- Do not invent account-specific facts. If resolution details are missing, give generic safe guidance.
- No HTML. Markdown only for the body text.

You MUST respond with a valid JSON object containing exactly one field: "markdown" (string).
Example: {"markdown": "## Update\\n\\nWe fixed …"}`;

export const ASK_QUESTION_SYSTEM_PROMPT = `Answer the user's question based ONLY on the context provided (transcript, and if present: summary and list of tasks).
Be concise. Use the same language as the question.
If the context does not contain relevant information, say so briefly.
Do NOT use markdown formatting in the answer — plain text only.

You MUST respond with a valid JSON object containing exactly one field: "answer" (string).
Example: {"answer": "Your response here"}`;

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
  return `Translate the following text to ${langName}. Preserve the original formatting and structure. Return ONLY the translated text, no explanations, no markdown.`;
}

export type AiProcessingOptions = {
  summaryStyle?: 'brief' | 'standard' | 'detailed';
  taskStrictness?: 'strict' | 'balanced' | 'soft';
  outputLanguage?: 'same' | 'ru' | 'en';
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
    'Extract ONLY explicitly stated tasks with clear action verbs. Ignore intentions, ideas, or vague plans.',
  balanced: 'Extract explicit tasks and clearly implied actionable items. Use reasonable judgment.',
  soft: 'Extract tasks, intentions, ideas, and vague plans that could become actionable.',
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

export function buildAiProcessingPrompt(options?: AiProcessingOptions | null): string {
  const summaryStyle = options?.summaryStyle ?? 'standard';
  const taskStrictness = options?.taskStrictness ?? 'balanced';
  const outputLanguage = options?.outputLanguage ?? 'same';

  const summaryInstruction = SUMMARY_STYLE_INSTRUCTIONS[summaryStyle];
  const taskInstruction = TASK_STRICTNESS_INSTRUCTIONS[taskStrictness];
  const languageInstruction = OUTPUT_LANGUAGE_INSTRUCTIONS[outputLanguage];

  const today = new Date().toISOString().slice(0, 10);

  return `You are a structured data extractor for voice note transcripts.
Return a single valid JSON object — no markdown, no code fences, no explanation, no trailing commas.

## LANGUAGE RULE (highest priority)
${languageInstruction}

## Output Schema

\`\`\`typescript
${OUTPUT_SCHEMA}
\`\`\`

## Field Rules

**summary:** ${summaryInstruction} No bullet points or markdown — plain prose only.

**suggestedTitle:** A short 3–8 word phrase capturing the essence of the note.
- Use title case for English, sentence case for other languages.
- Same language as summary.
- Do NOT use generic titles like "Voice note" or "Recording" unless the transcript is empty.

**tasks:** ${taskInstruction}
- priority: high = urgent or time-sensitive; medium = important but not urgent; low = vague or nice-to-have.
- deadline: today is ${today}. Convert natural language (e.g. "next Monday") to ISO 8601 (YYYY-MM-DD). If the date is unclear or not mentioned → null. Do NOT guess dates.

**tags:** 2–5 lowercase single or two-word tags (e.g. "meeting", "health", "finance").
- Do NOT use generic tags like "note", "voice note", "recording", "audio", "заметка".
- Tags must describe the topic, not the medium.

**classification:** personal | work | meeting | idea | other.
- If the transcript covers multiple topics, choose the dominant one.
- personal — diary, mood, personal thoughts.
- work — job tasks, projects, colleagues.
- meeting — discussion, call, sync with others.
- idea — brainstorm, concept, creative thinking.
- other — anything that does not fit clearly.

**keyPhrases:** 3–8 important terms, names, or short phrases (2–5 words each) from the transcript.
- Do NOT quote long sentences. Extract terms and names only.

**nextSteps:** Exactly 1–3 high-level follow-up actions prompted by the tasks.
- These are NOT a restatement of tasks. Write what to do to move forward.
- Good: "Open calendar to schedule team sync"
- Bad: "Schedule team meeting" (just repeats the task)
- If no tasks exist, suggest 1 clarifying or contextual next step.

**If the transcript is too short, unclear, or empty:** return safe defaults —
empty arrays for tasks/keyPhrases/nextSteps/tags, 1-sentence summary, suggestedTitle = "Voice note", classification = "other".
Never add fields outside the schema. Output must pass JSON.parse() without preprocessing.

## Examples

### Example 1 — work transcript (Russian)

Input:
"Нужно срочно отправить отчёт Ивану до пятницы и запланировать встречу с командой на следующей неделе."

Output:
{
  "summary": "Говорящий обозначил две рабочие задачи: срочная отправка отчёта Ивану до пятницы и планирование встречи с командой на следующей неделе.",
  "suggestedTitle": "Отчёт Ивану и встреча с командой",
  "tasks": [
    { "title": "Отправить отчёт Ивану", "priority": "high", "deadline": "${today}" },
    { "title": "Запланировать встречу с командой", "priority": "medium", "deadline": null }
  ],
  "tags": ["отчёт", "встреча", "команда"],
  "classification": "work",
  "keyPhrases": ["отчёт Ивану", "до пятницы", "встреча с командой", "следующая неделя"],
  "nextSteps": ["Открыть почту и отправить отчёт Ивану", "Создать событие в календаре для командной встречи"]
}

### Example 2 — short or unclear transcript

Input: "Хм, надо бы что-то сделать с этим..."

Output:
{
  "summary": "Говорящий выразил неопределённое намерение без конкретных деталей.",
  "suggestedTitle": "Неопределённое намерение",
  "tasks": [],
  "tags": ["идея"],
  "classification": "other",
  "keyPhrases": ["что-то сделать"],
  "nextSteps": ["Уточнить, что именно требует действий"]
}

### Example 3 — idea transcript (English)

Input:
"I want to build a habit tracker app. Something simple, no accounts, just local storage. Maybe share it on Product Hunt."

Output:
{
  "summary": "The speaker outlined an idea for a simple local-storage habit tracker app and mentioned a potential launch on Product Hunt.",
  "suggestedTitle": "Habit Tracker App Idea",
  "tasks": [
    { "title": "Design habit tracker app concept", "priority": "medium", "deadline": null },
    { "title": "Prepare Product Hunt launch", "priority": "low", "deadline": null }
  ],
  "tags": ["app", "productivity", "idea"],
  "classification": "idea",
  "keyPhrases": ["habit tracker", "local storage", "no accounts", "Product Hunt"],
  "nextSteps": ["Sketch a basic wireframe of the app", "Research similar apps on Product Hunt"]
}`;
}
