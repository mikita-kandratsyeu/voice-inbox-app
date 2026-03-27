import type { RNLlamaOAICompatibleMessage } from 'llama.rn';
import { initLlama, type LlamaContext } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';

const LOCAL_LLM_N_CTX = 4096;

let context: LlamaContext | null = null;
let loadedModelId: LocalAiModelId | null = null;

export async function ensureLocalLlmLoaded(modelId: LocalAiModelId): Promise<LlamaContext> {
  const path = getLocalLlmModelPath(modelId);
  if (!(await NitroFS.exists(path))) {
    throw new Error('Local LLM model file missing');
  }

  if (context && loadedModelId === modelId) {
    return context;
  }

  if (context) {
    await context.release().catch(() => {});
    context = null;
    loadedModelId = null;
  }

  const ctx = await initLlama({
    model: path,
    n_ctx: LOCAL_LLM_N_CTX,
    n_gpu_layers: 99,
    use_mmap: true,
    use_mlock: false,
  });

  context = ctx;
  loadedModelId = modelId;
  return ctx;
}

export async function completeLocalChat(
  modelId: LocalAiModelId,
  messages: RNLlamaOAICompatibleMessage[],
  options: { maxTokens: number; temperature?: number },
): Promise<string> {
  const ctx = await ensureLocalLlmLoaded(modelId);
  const result = await ctx.completion({
    messages,
    n_predict: options.maxTokens,
    temperature: options.temperature ?? 0.2,
    top_p: 0.9,
    enable_thinking: false,
  });

  return (result.text ?? result.content ?? '').trim();
}

export async function releaseLocalLlmSession(): Promise<void> {
  if (context) {
    await context.release().catch(() => {});
    context = null;
    loadedModelId = null;
  }
}
