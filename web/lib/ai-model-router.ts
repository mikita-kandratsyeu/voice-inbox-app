import {
  AI_MODEL_GEMINI_2_5_FLASH_LITE,
  AI_MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
} from '@/config/constants';

export type AiModelMode = 'manual' | 'auto';
export type AiTaskType = 'summary_tasks' | 'ask';

export type AiModelRoutingContext = {
  taskType: AiTaskType;
  transcriptChars: number;
};

const ASK_LONG_TRANSCRIPT_CHARS = 9_000;
const SUMMARY_LONG_TRANSCRIPT_CHARS = 14_000;

function normalizeTranscriptChars(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return Math.floor(raw);
}

export function resolveAutoAiModel(context: AiModelRoutingContext): string {
  const transcriptChars = normalizeTranscriptChars(context.transcriptChars);

  if (context.taskType === 'ask') {
    return transcriptChars >= ASK_LONG_TRANSCRIPT_CHARS
      ? AI_MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW
      : AI_MODEL_GEMINI_2_5_FLASH_LITE;
  }

  return transcriptChars >= SUMMARY_LONG_TRANSCRIPT_CHARS
    ? AI_MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW
    : AI_MODEL_GEMINI_2_5_FLASH_LITE;
}
