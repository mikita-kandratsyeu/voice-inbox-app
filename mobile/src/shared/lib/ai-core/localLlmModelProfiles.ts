import type { CompletionParams, ContextParams } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';
import type { DeviceCapabilities } from '@/shared/lib/deviceCapabilities';

export type LocalLlmCompletionIntent = 'json' | 'chat';

/**
 * Default KV context when a model profile does not set nCtx.
 * 10 240 (10K): moderate bump over 8K for long transcripts; still ~35% less KV RAM than 16K.
 */
export const DEFAULT_LOCAL_LLM_N_CTX = 10_240;

/** Llama / Qwen on-device profiles (1B–1.7B). */
export const LOCAL_LLM_N_CTX_COMPACT = 10_240;

/** Gemma 2 2B — slightly larger window for sliding-window attention. */
export const LOCAL_LLM_N_CTX_GEMMA = 14_336;

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
    nCtx: LOCAL_LLM_N_CTX_COMPACT,
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
    nCtx: LOCAL_LLM_N_CTX_COMPACT,
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
    // Gemma 2: sliding window 4K + global 8K; 14K n_ctx gives headroom without 16K KV cost.
    nCtx: LOCAL_LLM_N_CTX_GEMMA,
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

/**
 * Returns context params optimized for device capabilities.
 * Batch sizes scale with device tier for optimal throughput.
 */
export function getLocalLlmContextParams(capabilities: DeviceCapabilities): Partial<ContextParams> {
  return {
    n_parallel: 1,
    n_batch: capabilities.llmBatchSize,
    n_ubatch: capabilities.llmUbatchSize,
  };
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
