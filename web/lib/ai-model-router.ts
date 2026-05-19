import { AI_MODEL_GEMINI_2_5_FLASH_LITE, AI_MODEL_GEMINI_3_1_FLASH_LITE } from '@/config/constants';
import {
  ASK_QUESTION_SYSTEM_PROMPT,
  buildAiProcessingPromptAppendBlocks,
  type AiProcessingOptions,
} from '@/lib/prompts';

export type AiModelMode = 'manual' | 'auto';
export type AiTaskType = 'summary_tasks' | 'ask';

export type AskRoutingBasis = 'full_ask_estimate' | 'transcript_only';

export type AiModelRoutingContext = {
  taskType: AiTaskType;
  routingChars: number;
  askRoutingBasis?: AskRoutingBasis;
};

const DEFAULT_ASK_LONG_TRANSCRIPT_ANCHOR_CHARS = 9_000;
const DEFAULT_SUMMARY_LONG_ROUTING_CHARS = 14_000;
const ASK_ROUTING_WRAPPER_FUZZ_CHARS = 80;

function readRoutingThreshold(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function askLongRoutingCharsFullEstimate(): number {
  const anchor = readRoutingThreshold(
    'AI_ROUTE_ASK_LONG_CHARS',
    DEFAULT_ASK_LONG_TRANSCRIPT_ANCHOR_CHARS,
  );
  return anchor + ASK_QUESTION_SYSTEM_PROMPT.length + ASK_ROUTING_WRAPPER_FUZZ_CHARS;
}

function askLongRoutingCharsTranscriptOnly(): number {
  return readRoutingThreshold('AI_ROUTE_ASK_LONG_CHARS', DEFAULT_ASK_LONG_TRANSCRIPT_ANCHOR_CHARS);
}

function summaryLongRoutingChars(): number {
  return readRoutingThreshold('AI_ROUTE_SUMMARY_LONG_CHARS', DEFAULT_SUMMARY_LONG_ROUTING_CHARS);
}

function normalizeRoutingChars(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return Math.floor(raw);
}

export function estimateSummaryTasksRoutingChars(
  transcript: string,
  options?: AiProcessingOptions | null,
): number {
  const { existingTasksBlock, userHintBlock, recordingMarksBlock } =
    buildAiProcessingPromptAppendBlocks(options);
  return (
    transcript.length +
    existingTasksBlock.length +
    userHintBlock.length +
    recordingMarksBlock.length
  );
}

export function resolveAutoAiModel(context: AiModelRoutingContext): string {
  const routingChars = normalizeRoutingChars(context.routingChars);

  if (context.taskType === 'ask') {
    const threshold =
      context.askRoutingBasis === 'transcript_only'
        ? askLongRoutingCharsTranscriptOnly()
        : askLongRoutingCharsFullEstimate();

    return routingChars >= threshold
      ? AI_MODEL_GEMINI_3_1_FLASH_LITE
      : AI_MODEL_GEMINI_2_5_FLASH_LITE;
  }

  return routingChars >= summaryLongRoutingChars()
    ? AI_MODEL_GEMINI_3_1_FLASH_LITE
    : AI_MODEL_GEMINI_2_5_FLASH_LITE;
}
