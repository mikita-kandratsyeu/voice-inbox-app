import type { CompletionParams, ContextParams } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';

export type LocalLlmCompletionIntent = 'json' | 'chat';

/** Default KV context; per-model `nCtx` may override for RAM vs length tradeoffs. */
export const DEFAULT_LOCAL_LLM_N_CTX = 16_384;

/** One slot: we never use parallel.completion; saves KV RAM vs default n_parallel=8. */
const SHARED_CONTEXT: Partial<ContextParams> = {
  n_parallel: 1,
  /** Smaller batches = lower peak RAM during long prefills on phone SoCs. */
  n_batch: 512,
  n_ubatch: 256,
};

type LocalLlmModelProfile = {
  /** KV context for initLlama; omit to use DEFAULT_LOCAL_LLM_N_CTX. */
  nCtx?: number;
  /** When set, overrides default for summary / structured JSON tasks. */
  summaryTemperature?: number;
  /** When set, overrides default for ask-AI JSON tasks. */
  askTemperature?: number;
  base: Partial<CompletionParams>;
  json?: Partial<CompletionParams>;
  chat?: Partial<CompletionParams>;
};

const PROFILES: Record<LocalAiModelId, LocalLlmModelProfile> = {
  'local/qwen3-1.7b-q4_k_m': {
    base: {
      enable_thinking: false,
      reasoning_format: 'none',
      top_p: 0.88,
      penalty_repeat: 1.08,
    },
    json: {
      top_k: 48,
      penalty_repeat: 1.12,
      stop: ['<|redacted_im_end|>'],
    },
    chat: {
      top_k: 64,
      stop: ['<|redacted_im_end|>'],
    },
  },
  'local/llama-3.2-1b-q4_k_m': {
    nCtx: 8192,
    base: {
      enable_thinking: false,
      top_p: 0.95,
      penalty_repeat: 1.05,
    },
    json: {
      top_k: 50,
      penalty_repeat: 1.1,
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
    chat: {
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
  },
  'local/gemma-2-2b-it-q4_k_m': {
    nCtx: 12288,
    summaryTemperature: 0.18,
    askTemperature: 0.22,
    base: {
      enable_thinking: false,
      force_pure_content: true,
      top_p: 0.88,
      penalty_repeat: 1.08,
    },
    json: {
      penalty_repeat: 1.12,
      stop: ['<end_of_turn>'],
    },
    chat: {
      stop: ['<end_of_turn>'],
    },
  },
};

export function getLocalLlmNCtx(modelId: LocalAiModelId): number {
  return PROFILES[modelId].nCtx ?? DEFAULT_LOCAL_LLM_N_CTX;
}

export function getLocalLlmSummaryTemperature(modelId: LocalAiModelId, fallback: number): number {
  const v = PROFILES[modelId].summaryTemperature;
  return v ?? fallback;
}

export function getLocalLlmAskTemperature(modelId: LocalAiModelId, fallback: number): number {
  const v = PROFILES[modelId].askTemperature;
  return v ?? fallback;
}

export function getLocalLlmContextParams(): Partial<ContextParams> {
  return { ...SHARED_CONTEXT };
}

export function mergeLocalLlmCompletionParams(
  modelId: LocalAiModelId,
  intent: LocalLlmCompletionIntent,
): Partial<CompletionParams> {
  const p = PROFILES[modelId];

  return {
    ...p.base,
    ...(intent === 'json' ? p.json : p.chat),
  };
}
