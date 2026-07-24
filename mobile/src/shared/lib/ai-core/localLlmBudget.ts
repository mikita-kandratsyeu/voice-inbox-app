import type { LocalAiModelId } from '@/entities/settings';

import { getLocalLlmNCtx } from './localLlmModelProfiles';

/** Chat template, special tokens, and safety margin vs tokenizer mismatch. */
export const LOCAL_LLM_PROMPT_OVERHEAD_TOKENS = 1024;

/**
 * Conservative token upper bound for mixed scripts (Latin ~3 chars/token; dense CJK ~1.4).
 */
export function estimateLocalLlmPromptTokens(text: string): number {
  let nonAscii = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) nonAscii += 1;
  }
  const ratio = nonAscii / Math.max(text.length, 1);
  const charsPerToken = ratio > 0.35 ? 1.4 : 3.0;
  return Math.ceil(text.length / charsPerToken);
}

export function localPromptFitsLlmContext(
  promptText: string,
  maxNewTokens: number,
  modelId: LocalAiModelId,
): boolean {
  const nCtx = getLocalLlmNCtx(modelId);
  return (
    estimateLocalLlmPromptTokens(promptText) + maxNewTokens + LOCAL_LLM_PROMPT_OVERHEAD_TOKENS <=
    nCtx
  );
}
