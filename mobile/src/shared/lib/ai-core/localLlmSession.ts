import type { RNLlamaOAICompatibleMessage, TokenData } from 'llama.rn';
import { initLlama, type LlamaContext } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';
import { getDeviceCapabilities } from '@/shared/lib/deviceCapabilities';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';

import { estimateKvCacheRamMb, getOptimalNCtx, type LlmTaskType } from './localLlmDynamicContext';
import {
  getLocalLlmContextParams,
  type LocalLlmCompletionIntent,
  mergeLocalLlmCompletionParams,
} from './localLlmModelProfiles';
import {
  canCreateNewSession,
  evictLruSession,
  getSession,
  registerSession,
  releaseAllSessions,
  releaseSession,
  scheduleSessionRelease,
} from './localLlmMultiSession';

// Serial queue per model to prevent concurrent operations on same context
const llmSerialQueues = new Map<LocalAiModelId, Promise<unknown>>();

export type LocalLlmSessionProgressEvent =
  | { kind: 'prepare_model_start' }
  | { kind: 'prepare_model_done'; nCtx: number; estimatedRamMb: number }
  | { kind: 'completion_tick' };

function enqueueLlmTask<T>(modelId: LocalAiModelId, task: () => Promise<T>): Promise<T> {
  const currentQueue = llmSerialQueues.get(modelId) ?? Promise.resolve();
  const next = currentQueue.then(() => task());

  llmSerialQueues.set(
    modelId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );

  return next;
}

async function releaseContextLocked(ctx: LlamaContext): Promise<void> {
  await ctx.release().catch(() => {});
}

async function ensureContextLocked(
  modelId: LocalAiModelId,
  taskType: LlmTaskType,
  transcriptLength: number,
): Promise<LlamaContext> {
  const path = getLocalLlmModelPath(modelId);
  if (!(await NitroFS.exists(path))) {
    throw new Error('Local LLM model file missing');
  }

  // Check if model is already loaded
  const existingCtx = getSession(modelId);
  if (existingCtx) {
    return existingCtx;
  }

  // Check if we can create a new session
  if (!canCreateNewSession()) {
    // Evict LRU session to make room
    await evictLruSession(releaseContextLocked);
  }

  // Calculate optimal context size for this task
  const nCtx = getOptimalNCtx(taskType, transcriptLength, modelId);
  const capabilities = getDeviceCapabilities();

  try {
    const ctx = await initLlama({
      model: path,
      n_ctx: nCtx,
      n_gpu_layers: capabilities.llmGpuLayers,
      use_mmap: true,
      use_mlock: false,
      // q4_0 KV cache halves RAM usage vs q8_0 with minimal quality loss
      cache_type_k: 'q4_0',
      cache_type_v: 'q4_0',
      ...getLocalLlmContextParams(capabilities),
      // Flash attention on iOS with Metal acceleration
      ...(capabilities.llmGpuLayers > 0 ? { flash_attn_type: 'auto' as const } : {}),
    });

    registerSession(modelId, ctx);
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
    taskType: LlmTaskType;
    transcriptLength: number;
    onLlmSessionProgress?: (event: LocalLlmSessionProgressEvent) => void;
  },
): Promise<string> {
  options.onLlmSessionProgress?.({ kind: 'prepare_model_start' });

  const ctx = await ensureContextLocked(modelId, options.taskType, options.transcriptLength);

  // Report context size for monitoring/debugging
  const nCtx = getOptimalNCtx(options.taskType, options.transcriptLength, modelId);
  const estimatedRamMb = estimateKvCacheRamMb(nCtx);
  options.onLlmSessionProgress?.({ kind: 'prepare_model_done', nCtx, estimatedRamMb });

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
    taskType: LlmTaskType;
    transcriptLength: number;
    onLlmSessionProgress?: (event: LocalLlmSessionProgressEvent) => void;
  },
): Promise<string> {
  const result = await enqueueLlmTask(modelId, () =>
    runCompletionLocked(modelId, messages, options),
  );

  // Schedule delayed release after completion
  scheduleSessionRelease(modelId, releaseContextLocked);

  return result;
}

export type { LlmTaskType } from './localLlmDynamicContext';
export type { LocalLlmCompletionIntent } from './localLlmModelProfiles';

/**
 * Releases local LLM session(s).
 * @param modelId - Specific model to release, or undefined to release all
 * @param immediate - If true, releases immediately. If false (default), schedules release after keep-alive timeout.
 */
export async function releaseLocalLlmSession(
  modelId?: LocalAiModelId,
  immediate = false,
): Promise<void> {
  if (modelId) {
    if (immediate) {
      await enqueueLlmTask(modelId, () => releaseSession(modelId, releaseContextLocked));
    } else {
      scheduleSessionRelease(modelId, releaseContextLocked);
    }
  } else {
    // Release all sessions
    if (immediate) {
      await releaseAllSessions(releaseContextLocked);
      llmSerialQueues.clear();
    } else {
      // Schedule release for all active sessions
      const { models } = await import('./localLlmMultiSession').then((m) => m.getSessionStats());
      models.forEach((id) => {
        scheduleSessionRelease(id as LocalAiModelId, releaseContextLocked);
      });
    }
  }
}
