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
  strict: 'Extract ONLY explicitly stated tasks. Ignore intentions, ideas, or vague plans.',
  balanced: 'Extract explicit tasks and clearly implied actionable items. Use reasonable judgment.',
  soft: 'Extract tasks, intentions, ideas, and vague plans that could become actionable.',
};

const OUTPUT_LANGUAGE_INSTRUCTIONS: Record<
  NonNullable<AiProcessingOptions['outputLanguage']>,
  string
> = {
  same: 'Write ALL text fields (summary, task titles, tags, keyPhrases, nextSteps) in the SAME language as the transcript.',
  ru: 'Write ALL text fields (summary, task titles, tags, keyPhrases, nextSteps) in Russian, regardless of the transcript language.',
  en: 'Write ALL text fields (summary, task titles, tags, keyPhrases, nextSteps) in English, regardless of the transcript language.',
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
  deadline: string | null; // ISO 8601 (YYYY-MM-DD) or null
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
Return a single valid JSON object — no markdown, no code fences, no explanation.

## LANGUAGE RULE (highest priority)
${languageInstruction}

## Output Schema

\`\`\`typescript
${OUTPUT_SCHEMA}
\`\`\`

## Field Rules

**summary:** ${summaryInstruction}

**suggestedTitle:** A short 3–8 word phrase that captures the essence of the note. Use for replacing default note titles. Same language as summary. Be concise and descriptive.

**tasks:** ${taskInstruction}
- priority: high = urgent or time-sensitive; medium = important but not urgent; low = vague or nice-to-have
- deadline: today is ${today}. Convert natural language (e.g. "next Monday") to ISO 8601. Use null if not mentioned.

**tags:** 2–5 lowercase tags, 1–2 words each (e.g. "meeting", "health", "finance")

**classification:**
- personal — diary, mood, personal thoughts
- work — job tasks, projects, colleagues
- meeting — discussion, call, sync
- idea — brainstorm, concept, creative
- other — anything else

**keyPhrases:** 3–8 important terms, names, or short direct quotes from the transcript

**nextSteps:** 1–3 high-level follow-up actions prompted by the tasks.
IMPORTANT: These are NOT a restatement of tasks.
Write what to do to move forward, not what was said.
Good: "Open calendar to schedule team sync"
Bad: "Schedule team meeting" (this is just the task again)
If no tasks exist, suggest 1 clarifying or contextual next step.

**If the transcript is too short or unclear:** return all fields with safe defaults
(empty arrays for tasks/keyPhrases/nextSteps, short 1-sentence summary, suggestedTitle e.g. "Voice note", classification "other").
Never add fields outside the schema. Output must pass JSON.parse() without preprocessing.

## Examples

### Example 1 — normal work transcript (Russian)

Input:
"Нужно срочно отправить отчёт Ивану до пятницы и запланировать встречу с командой на следующей неделе."

Output:
{
  "summary": "Говорящий обозначил две рабочие задачи: срочная отправка отчёта Ивану до пятницы и планирование встречи с командой на следующей неделе.",
  "suggestedTitle": "Отчёт Ивану и встреча с командой",
  "tasks": [
    { "title": "Отправить отчёт Ивану", "priority": "high", "deadline": "2024-01-19" },
    { "title": "Запланировать встречу с командой", "priority": "medium", "deadline": "2024-01-22" }
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
  "tags": ["заметка"],
  "classification": "other",
  "keyPhrases": ["что-то сделать"],
  "nextSteps": ["Уточнить, что именно требует действий"]
}`;
}
