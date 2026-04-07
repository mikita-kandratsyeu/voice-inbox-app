import type { CompletionParams, ContextParams } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';

export type LocalLlmCompletionIntent = 'json' | 'chat';

/**
 * Default KV context when a model profile does not set nCtx.
 * Kept at 8 192 — sufficient for all task budgets (max prompt ~14 K chars ≈ 4 700 tokens
 * + 2 048 output + 1 024 overhead = ~7 772), while halving KV RAM vs 16 K.
 */
export const DEFAULT_LOCAL_LLM_N_CTX = 8_192;

/**
 * Shared initLlama context params.
 * n_batch/n_ubatch are raised vs the old 512/256: on iOS the GPU pipeline can
 * saturate larger batches during the prefill phase without RAM pressure because
 * Metal manages buffer reuse. On Android (CPU-only) llama.rn caps n_batch at the
 * smaller value anyway, so this is safe cross-platform.
 */
const SHARED_CONTEXT: Partial<ContextParams> = {
  n_parallel: 1,
  n_batch: 1024,
  n_ubatch: 512,
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
    // 8 K is enough: max task input ~14 K chars ≈ 4 700 tokens + 2 048 output + overhead.
    // Halves KV RAM vs 16 K (~210 MB → ~105 MB on device).
    nCtx: 8_192,
    base: {
      enable_thinking: false,
      reasoning_format: 'none',
      // min_p trims the low-probability tail more aggressively than top_p alone —
      // important for structured output where stray tokens break JSON.
      min_p: 0.05,
      top_p: 0.88,
      penalty_repeat: 1.08,
    },
    json: {
      top_k: 40,
      min_p: 0.06,
      penalty_repeat: 1.12,
      stop: ['<|redacted_im_end|>'],
    },
    chat: {
      top_k: 60,
      stop: ['<|redacted_im_end|>'],
    },
  },
  'local/llama-3.2-1b-q4_k_m': {
    nCtx: 8192,
    base: {
      enable_thinking: false,
      min_p: 0.05,
      top_p: 0.92,
      penalty_repeat: 1.05,
    },
    json: {
      top_k: 40,
      min_p: 0.06,
      penalty_repeat: 1.1,
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
    chat: {
      top_k: 50,
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
  },
  'local/gemma-2-2b-it-q4_k_m': {
    // Gemma 2 uses local sliding window attention up to 4 096 and global at 8 192;
    // 12 K covers both windows with headroom for long transcripts.
    nCtx: 12288,
    summaryTemperature: 0.18,
    askTemperature: 0.22,
    base: {
      enable_thinking: false,
      force_pure_content: true,
      min_p: 0.05,
      top_p: 0.88,
      penalty_repeat: 1.08,
    },
    json: {
      top_k: 40,
      min_p: 0.06,
      penalty_repeat: 1.12,
      stop: ['<end_of_turn>'],
    },
    chat: {
      top_k: 55,
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
