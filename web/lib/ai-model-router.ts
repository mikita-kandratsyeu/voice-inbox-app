import {
  AI_MODEL_DEEPSEEK_V4_FLASH_NITRO,
  AI_MODEL_GEMINI_2_5_FLASH_LITE,
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
} from '@/config/constants';
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

const DEFAULT_ASK_MEDIUM_TRANSCRIPT_ANCHOR_CHARS = 5_000;
const DEFAULT_ASK_LONG_TRANSCRIPT_ANCHOR_CHARS = 9_000;
const DEFAULT_SUMMARY_MEDIUM_ROUTING_CHARS = 8_000;
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

function askMediumRoutingCharsTranscriptOnly(): number {
  return readRoutingThreshold(
    'AI_ROUTE_ASK_MEDIUM_CHARS',
    DEFAULT_ASK_MEDIUM_TRANSCRIPT_ANCHOR_CHARS,
  );
}

function askLongRoutingCharsTranscriptOnly(): number {
  return readRoutingThreshold('AI_ROUTE_ASK_LONG_CHARS', DEFAULT_ASK_LONG_TRANSCRIPT_ANCHOR_CHARS);
}

function askMediumRoutingCharsFullEstimate(): number {
  return (
    askMediumRoutingCharsTranscriptOnly() +
    ASK_QUESTION_SYSTEM_PROMPT.length +
    ASK_ROUTING_WRAPPER_FUZZ_CHARS
  );
}

function summaryMediumRoutingChars(): number {
  return readRoutingThreshold(
    'AI_ROUTE_SUMMARY_MEDIUM_CHARS',
    DEFAULT_SUMMARY_MEDIUM_ROUTING_CHARS,
  );
}

function summaryLongRoutingChars(): number {
  return readRoutingThreshold('AI_ROUTE_SUMMARY_LONG_CHARS', DEFAULT_SUMMARY_LONG_ROUTING_CHARS);
}

/** Auto tier: short → Gemini 2.5, medium → DeepSeek nitro, long → Gemini 3.1. */
function resolveAutoAiModelByThresholds(
  routingChars: number,
  mediumAt: number,
  longAt: number,
): string {
  if (routingChars >= longAt) {
    return AI_MODEL_GEMINI_3_1_FLASH_LITE;
  }

  if (routingChars >= mediumAt) {
    return AI_MODEL_DEEPSEEK_V4_FLASH_NITRO;
  }

  return AI_MODEL_GEMINI_2_5_FLASH_LITE;
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
    const transcriptOnly = context.askRoutingBasis === 'transcript_only';
    const mediumAt = transcriptOnly
      ? askMediumRoutingCharsTranscriptOnly()
      : askMediumRoutingCharsFullEstimate();
    const longAt = transcriptOnly
      ? askLongRoutingCharsTranscriptOnly()
      : askLongRoutingCharsFullEstimate();

    return resolveAutoAiModelByThresholds(routingChars, mediumAt, longAt);
  }

  return resolveAutoAiModelByThresholds(
    routingChars,
    summaryMediumRoutingChars(),
    summaryLongRoutingChars(),
  );
}
