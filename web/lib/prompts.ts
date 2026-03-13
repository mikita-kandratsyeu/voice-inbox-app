export type AiProcessingOptions = {
  summaryStyle?: 'brief' | 'standard' | 'detailed';
  taskStrictness?: 'strict' | 'balanced' | 'soft';
  outputLanguage?: 'same' | 'ru' | 'en';
};

const SUMMARY_STYLE_INSTRUCTIONS: Record<
  NonNullable<AiProcessingOptions['summaryStyle']>,
  string
> = {
  brief: 'Summary must be 1–2 sentences only.',
  standard: 'Summary must be 2–4 sentences.',
  detailed: 'Summary must be 4–6 sentences.',
};

const TASK_STRICTNESS_INSTRUCTIONS: Record<
  NonNullable<AiProcessingOptions['taskStrictness']>,
  string
> = {
  strict:
    'Extract ONLY explicit, clearly stated tasks. Do not include intentions, ideas, or vague plans.',
  balanced:
    'Extract both explicit tasks and clearly implied actionable items. Use reasonable judgment.',
  soft: 'Extract tasks, intentions, ideas, and plans that could become actionable. Include broader commitments.',
};

const OUTPUT_LANGUAGE_INSTRUCTIONS: Record<
  NonNullable<AiProcessingOptions['outputLanguage']>,
  string
> = {
  same: 'Write summary, task titles, and tags in the **same language as the transcript**.',
  ru: 'Write summary, task titles, and tags **always in Russian**.',
  en: 'Write summary, task titles, and tags **always in English**.',
};

const BASE_SCHEMA = `{
  "summary": string,       // length per summary style
  "tasks": Task[],         // extracted actionable items (empty array if none)
  "tags": string[],        // 2–5 lowercase topic tags, 1–2 words each
  "classification": "personal" | "work" | "meeting" | "idea" | "other",  // content type
  "keyPhrases": string[],  // 3–8 important terms or short quotes from transcript
  "nextSteps": string[]    // 1–3 actionable suggestions: "What to do next?" based on tasks
}

type Task = {
  "title": string,         // clear, actionable task description
  "priority": "high" | "medium" | "low",
  "deadline": string | null  // ISO 8601 date (YYYY-MM-DD) if mentioned, otherwise null
}`;

export function buildAiProcessingPrompt(options?: AiProcessingOptions | null): string {
  const summaryStyle = options?.summaryStyle ?? 'standard';
  const taskStrictness = options?.taskStrictness ?? 'balanced';
  const outputLanguage = options?.outputLanguage ?? 'same';

  const summaryInstruction = SUMMARY_STYLE_INSTRUCTIONS[summaryStyle];
  const taskInstruction = TASK_STRICTNESS_INSTRUCTIONS[taskStrictness];
  const languageInstruction = OUTPUT_LANGUAGE_INSTRUCTIONS[outputLanguage];

  return `You are a structured data extractor for voice note transcripts.

Your task is to analyze a transcript and return a single valid JSON object — nothing else. No markdown, no code blocks, no explanations.

## Output Schema

${BASE_SCHEMA}

## Rules

- ${languageInstruction}
- **Summary:** ${summaryInstruction}
- **Tasks:** ${taskInstruction}
- Tags must be lowercase, concise, and meaningful (e.g. "meeting", "health", "finance")
- Priority estimation:
    - high — urgent, time-sensitive, or explicitly marked as important
    - medium — important but not urgent
    - low — nice-to-have or vague intentions
- If a deadline is mentioned in natural language (e.g. "next Monday"), convert it to ISO 8601
- **Classification:** personal (personal thoughts, diary), work (job, projects), meeting (discussion, call), idea (brainstorm, concept), other
- **keyPhrases:** Extract 3–8 important terms, names, or short direct quotes that capture key points
- **nextSteps:** Based on extracted tasks, suggest 1–3 concrete next actions (e.g. "Schedule the meeting", "Send the report")
- If the transcript is unclear or too short to extract meaningful data, still return all fields with reasonable defaults
- Never include fields outside the schema
- Output must be parseable by JSON.parse() without any preprocessing

## Example

Input: "Нужно срочно отправить отчёт Ивану до пятницы и запланировать встречу с командой на следующей неделе."

Output:
{
  "summary": "Говорящий упомянул два срочных дела: отправку отчёта и организацию командной встречи.",
  "tasks": [
    { "title": "Отправить отчёт Ивану", "priority": "high", "deadline": "2024-01-19" },
    { "title": "Запланировать встречу с командой", "priority": "medium", "deadline": "2024-01-22" }
  ],
  "tags": ["отчёт", "встреча", "команда"]
}`;
}
