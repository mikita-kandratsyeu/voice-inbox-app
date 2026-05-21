import { AI_MODEL_STEP_3_5_FLASH, normalizeIncomingAiModel } from '@/config/constants';

/** Models that reject OpenRouter `response_format: json_object` (provider 405). */
const MODELS_WITHOUT_JSON_OBJECT_RESPONSE_FORMAT = new Set<string>([AI_MODEL_STEP_3_5_FLASH]);

export function openRouterModelSupportsJsonObjectResponseFormat(model: string): boolean {
  const canonical = normalizeIncomingAiModel(model.trim());
  return !MODELS_WITHOUT_JSON_OBJECT_RESPONSE_FORMAT.has(canonical);
}

export function openRouterJsonObjectResponseFormat(
  model: string,
): { type: 'json_object' } | undefined {
  return openRouterModelSupportsJsonObjectResponseFormat(model)
    ? { type: 'json_object' }
    : undefined;
}
