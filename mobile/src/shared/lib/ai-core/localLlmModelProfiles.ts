import type { CompletionParams, ContextParams } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';

/**
 * json — summary + ask (оба пути ожидают JSON от модели).
 * chat — более мягкие стопы/сэмплинг, если позже появится свободный текст без JSON.
 */
export type LocalLlmCompletionIntent = 'json' | 'chat';

/** One slot: we never use parallel.completion; saves KV RAM vs default n_parallel=8. */
const SHARED_CONTEXT: Partial<ContextParams> = {
  n_parallel: 1,
  /** Smaller batches = lower peak RAM during long prefills on phone SoCs. */
  n_batch: 512,
  n_ubatch: 256,
};

type CompletionProfile = {
  /** Always merged first */
  base: Partial<CompletionParams>;
  /** Extra params when intent is json */
  json?: Partial<CompletionParams>;
  /** Extra params when intent is chat */
  chat?: Partial<CompletionParams>;
};

const PROFILES: Record<LocalAiModelId, CompletionProfile> = {
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
      stop: ['<|im_end|>'],
    },
    chat: {
      top_k: 64,
      stop: ['<|im_end|>'],
    },
  },
  'local/llama-3.2-1b-q4_k_m': {
    base: {
      enable_thinking: false,
      top_p: 0.9,
      penalty_repeat: 1.05,
    },
    json: {
      penalty_repeat: 1.1,
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
    chat: {
      stop: ['<|eot_id|>', '<|end_of_text|>'],
    },
  },
  'local/gemma-2-2b-it-q4_k_m': {
    base: {
      enable_thinking: false,
      /** Gemma Jinja templates are happier with plain content parsing (llama.rn note). */
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
