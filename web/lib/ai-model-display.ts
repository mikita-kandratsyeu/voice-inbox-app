import {
  AI_MODEL_DEEPSEEK_V4_FLASH,
  AI_MODEL_GEMINI_2_5_FLASH_LITE,
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_GPT_5_4_NANO,
  AI_MODEL_MIMO_V2_5_PRO,
  AI_MODEL_NEMOTRON_3_SUPER,
  normalizeIncomingAiModel,
} from '@/config/constants';

/** Server-side catalog for human-readable model names in API responses. */
const AI_MODEL_DISPLAY_LABELS: Record<string, string> = {
  [AI_MODEL_GEMINI_2_5_FLASH_LITE]: 'Gemini 2.5 Flash Lite',
  [AI_MODEL_GEMINI_3_1_FLASH_LITE]: 'Gemini 3.1 Flash Lite',
  [AI_MODEL_DEEPSEEK_V4_FLASH]: 'DeepSeek V4 Flash',
  [AI_MODEL_GPT_5_4_NANO]: 'GPT-5.4 Nano',
  [AI_MODEL_MIMO_V2_5_PRO]: 'MiMo V2.5 Pro',
  'minimax/minimax-m2.7': 'MiniMax M2.7',
  [AI_MODEL_NEMOTRON_3_SUPER]: 'Nemotron 3 Super',
};

function fallbackDisplayLabel(modelId: string): string {
  const slug = modelId.includes('/') ? modelId.split('/').pop()! : modelId;
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getAiModelDisplayLabel(modelId: string): string {
  const canonical = normalizeIncomingAiModel(modelId.trim());
  if (!canonical) return '';
  return AI_MODEL_DISPLAY_LABELS[canonical] ?? fallbackDisplayLabel(canonical);
}

/** `model` id for routing + `modelLabel` for UI (clients should prefer the label when present). */
export function aiModelResponseFields(modelId: string): { model: string; modelLabel: string } {
  const model = normalizeIncomingAiModel(modelId.trim());
  return { model, modelLabel: getAiModelDisplayLabel(model) };
}

/** Backfill `modelLabel` for KV entries written before labels were stored. */
export function enrichMessageWithModelLabel<T extends { model?: string; modelLabel?: string }>(
  message: T,
): T {
  if (!message.model?.trim() || message.modelLabel?.trim()) {
    return message;
  }
  return { ...message, modelLabel: getAiModelDisplayLabel(message.model) };
}
