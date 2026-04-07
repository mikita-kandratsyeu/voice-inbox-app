import type { RNLlamaOAICompatibleMessage, TokenData } from 'llama.rn';
import { initLlama, type LlamaContext } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';

import { IS_IOS } from '../platform';
import {
  getLocalLlmContextParams,
  getLocalLlmNCtx,
  type LocalLlmCompletionIntent,
  mergeLocalLlmCompletionParams,
} from './localLlmModelProfiles';

const LOCAL_LLM_N_GPU_LAYERS = IS_IOS ? 99 : 0;

let context: LlamaContext | null = null;
let loadedModelId: LocalAiModelId | null = null;
let llmSerialQueue: Promise<unknown> = Promise.resolve();

export type LocalLlmSessionProgressEvent =
  | { kind: 'prepare_model_start' }
  | { kind: 'prepare_model_done' }
  | { kind: 'completion_tick' };

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
      n_ctx: getLocalLlmNCtx(modelId),
      n_gpu_layers: LOCAL_LLM_N_GPU_LAYERS,
      use_mmap: true,
      use_mlock: false,
      // On iOS the KV cache lives in Metal-managed GPU memory; q4_0 halves KV RAM
      // vs q8_0 with negligible quality impact at these model sizes (1–2 B params).
      // On Android (CPU path) q4_0 still saves host RAM, so it is safe cross-platform.
      cache_type_k: 'q4_0',
      cache_type_v: 'q4_0',
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
  options: {
    maxTokens: number;
    temperature?: number;
    intent?: LocalLlmCompletionIntent;
    onLlmSessionProgress?: (event: LocalLlmSessionProgressEvent) => void;
  },
): Promise<string> {
  options.onLlmSessionProgress?.({ kind: 'prepare_model_start' });
  const ctx = await ensureContextLocked(modelId);
  options.onLlmSessionProgress?.({ kind: 'prepare_model_done' });
  const intent = options.intent ?? 'chat';
  const profile = mergeLocalLlmCompletionParams(modelId, intent);
  try {
    const tokenCb = options.onLlmSessionProgress
      ? (_data: TokenData) => {
          options.onLlmSessionProgress?.({ kind: 'completion_tick' });
        }
      : undefined;
    const result = await ctx.completion(
      {
        messages,
        ...profile,
        n_predict: options.maxTokens,
        temperature: options.temperature ?? 0.2,
        add_generation_prompt: true,
      },
      tokenCb,
    );
    return (result.text ?? result.content ?? '').trim();
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(`Local LLM completion failed: ${hint}`);
  }
}

export async function completeLocalChat(
  modelId: LocalAiModelId,
  messages: RNLlamaOAICompatibleMessage[],
  options: {
    maxTokens: number;
    temperature?: number;
    intent?: LocalLlmCompletionIntent;
    onLlmSessionProgress?: (event: LocalLlmSessionProgressEvent) => void;
  },
): Promise<string> {
  return enqueueLlmTask(() => runCompletionLocked(modelId, messages, options));
}

export type { LocalLlmCompletionIntent } from './localLlmModelProfiles';

export async function releaseLocalLlmSession(): Promise<void> {
  await enqueueLlmTask(() => releaseContextLocked());
}
