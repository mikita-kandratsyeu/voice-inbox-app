import type { RNLlamaOAICompatibleMessage } from 'llama.rn';
import { initLlama, type LlamaContext } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';

import { IS_IOS } from '../platform';
import { LOCAL_LLM_N_CTX } from './localLlmBudget';
import {
  getLocalLlmContextParams,
  type LocalLlmCompletionIntent,
  mergeLocalLlmCompletionParams,
} from './localLlmModelProfiles';

/**
 * Must fit: chat template + system prompt + transcript (see local-provider caps) + n_predict.
 * 8192 was too small for full-tier transcripts and could crash native llama when the prompt
 * exceeds the KV context.
 */

/**
 * llama.rn maps this mainly to iOS Metal. Android GPU/Vulkan stacks are a frequent crash source;
 * CPU inference is slower but stable.
 */
const LOCAL_LLM_N_GPU_LAYERS = IS_IOS ? 99 : 0;

let context: LlamaContext | null = null;
let loadedModelId: LocalAiModelId | null = null;

/** Single-flight queue: one LlamaContext cannot safely run concurrent native completions. */
let llmSerialQueue: Promise<unknown> = Promise.resolve();

function enqueueLlmTask<T>(task: () => Promise<T>): Promise<T> {
  const next = llmSerialQueue.then(() => task());
  llmSerialQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function releaseContextLocked(): Promise<void> {
  if (context) {
    await context.release().catch(() => {});
    context = null;
    loadedModelId = null;
  }
}

async function ensureContextLocked(modelId: LocalAiModelId): Promise<LlamaContext> {
  const path = getLocalLlmModelPath(modelId);
  if (!(await NitroFS.exists(path))) {
    throw new Error('Local LLM model file missing');
  }

  if (context && loadedModelId === modelId) {
    return context;
  }

  await releaseContextLocked();

  try {
    const ctx = await initLlama({
      model: path,
      n_ctx: LOCAL_LLM_N_CTX,
      n_gpu_layers: LOCAL_LLM_N_GPU_LAYERS,
      use_mmap: true,
      use_mlock: false,
      ...getLocalLlmContextParams(),
      ...(IS_IOS && LOCAL_LLM_N_GPU_LAYERS > 0 ? { flash_attn_type: 'auto' as const } : {}),
    });
    context = ctx;
    loadedModelId = modelId;
    return ctx;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(`Local LLM init failed: ${hint}`);
  }
}

async function runCompletionLocked(
  modelId: LocalAiModelId,
  messages: RNLlamaOAICompatibleMessage[],
  options: { maxTokens: number; temperature?: number; intent?: LocalLlmCompletionIntent },
): Promise<string> {
  const ctx = await ensureContextLocked(modelId);
  const intent = options.intent ?? 'chat';
  const profile = mergeLocalLlmCompletionParams(modelId, intent);
  try {
    const result = await ctx.completion({
      messages,
      ...profile,
      n_predict: options.maxTokens,
      temperature: options.temperature ?? 0.2,
      add_generation_prompt: true,
    });
    return (result.text ?? result.content ?? '').trim();
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(`Local LLM completion failed: ${hint}`);
  }
}

export async function completeLocalChat(
  modelId: LocalAiModelId,
  messages: RNLlamaOAICompatibleMessage[],
  options: { maxTokens: number; temperature?: number; intent?: LocalLlmCompletionIntent },
): Promise<string> {
  return enqueueLlmTask(() => runCompletionLocked(modelId, messages, options));
}

export type { LocalLlmCompletionIntent } from './localLlmModelProfiles';

export async function releaseLocalLlmSession(): Promise<void> {
  await enqueueLlmTask(() => releaseContextLocked());
}
