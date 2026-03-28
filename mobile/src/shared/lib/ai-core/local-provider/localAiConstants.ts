import type { AiExecutionContext } from '../types';

export const TRANSCRIPT_CHAR_LIMIT_BY_TIER: Record<
  AiExecutionContext['privateCapabilityTier'],
  number
> = {
  full: 14_000,
  limited: 5000,
  unavailable: 5000,
};

export const FIELD_LIMITS = {
  tasks: 25,
  tags: 5,
  keyPhrases: 8,
  nextSteps: 3,
  suggestedTitleMaxChars: 100,
} as const;

export const LOCAL_ASK_SUMMARY_MAX_CHARS = 2000;
export const LOCAL_ASK_MAX_TASK_ITEMS = 25;

export const LOCAL_GEN_SUMMARY = { maxTokens: 1024, temperature: 0.2 } as const;
export const LOCAL_GEN_ASK = { maxTokens: 450, temperature: 0.25 } as const;

export const STRICT_JSON_TAIL =
  'Return JSON only: a single JSON object, no prose, no markdown, no code fences, no backticks.';

export const TRUNCATION_MARKER = '\n\n[...]\n\n';
