import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { getAiJobRunContext } from '@/lib/ai-job-context';
import {
  openRouterModelSupportsReasoning,
  openRouterReasoningParamsForModel,
} from '@/lib/openrouter-reasoning';
import { openRouterJsonObjectResponseFormat } from '@/lib/openrouter-response-format';
import { normalizeClientUserAgent } from '@/lib/openrouter';
import {
  clearOpenRouterPendingGeneration,
  isOpenRouterRecoverableTransportError,
  pollOpenRouterGenerationContent,
  readOpenRouterGenerationId,
  saveOpenRouterPendingGeneration,
  tryRecoverOpenRouterPendingGeneration,
  type OpenRouterRecoveredCompletion,
} from '@/lib/openrouter-recovery';
import type { DeepSeekChatMessage } from '@/lib/deepseek';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type SendOpenRouterChatCompletionParams = {
  model: string;
  messages: DeepSeekChatMessage[];
  jsonObject?: boolean;
  withReasoning?: boolean;
  temperature?: number;
  clientUserAgent?: string | null;
  userId?: string | null;
};

export type OpenRouterChatCompletionResult = {
  content: string;
  message: unknown;
  raw: unknown;
};

type StreamAccumulation = {
  generationId?: string;
  model?: string;
  content: string;
  reasoning: string;
  usage?: unknown;
};

function openRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
  return key;
}

function buildRequestBody(params: SendOpenRouterChatCompletionParams): Record<string, unknown> {
  const model = params.model.trim();
  const reasoning =
    params.withReasoning && openRouterModelSupportsReasoning(model)
      ? openRouterReasoningParamsForModel(model)
      : undefined;

  return {
    model,
    messages: params.messages,
    stream: true,
    provider: { zdr: true },
    ...(params.jsonObject ? { response_format: openRouterJsonObjectResponseFormat() } : {}),
    ...(params.temperature != null ? { temperature: params.temperature } : {}),
    ...(reasoning ? { reasoning } : {}),
    ...(params.userId?.trim() ? { user: params.userId.trim() } : {}),
  };
}

function buildRequestHeaders(clientUserAgent?: string | null): Headers {
  const headers = new Headers({
    Authorization: `Bearer ${openRouterApiKey()}`,
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'HTTP-Referer': BASE_URL_OR_FALLBACK,
    'X-OpenRouter-Title': 'Voice Inbox AI',
  });

  const ua = normalizeClientUserAgent(clientUserAgent);
  if (ua) {
    headers.set('User-Agent', ua);
  }

  return headers;
}

function appendDeltaText(target: string, delta: unknown): string {
  if (typeof delta !== 'string' || !delta) return target;
  return target + delta;
}

function readStreamChunkError(chunk: Record<string, unknown>): string | undefined {
  const error = chunk.error;
  if (!error || typeof error !== 'object') return undefined;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message.trim() : undefined;
}

function applyStreamChunk(accum: StreamAccumulation, chunk: Record<string, unknown>): void {
  const streamError = readStreamChunkError(chunk);
  if (streamError) {
    throw new Error(`OpenRouter stream error: ${streamError}`);
  }

  if (typeof chunk.id === 'string' && chunk.id.trim()) {
    accum.generationId = chunk.id.trim();
  }
  if (typeof chunk.model === 'string' && chunk.model.trim()) {
    accum.model = chunk.model.trim();
  }
  if (chunk.usage) {
    accum.usage = chunk.usage;
  }

  const choices = chunk.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return;

  const choice = choices[0] as Record<string, unknown>;
  const delta =
    choice.delta && typeof choice.delta === 'object'
      ? (choice.delta as Record<string, unknown>)
      : null;
  if (!delta) return;

  accum.content = appendDeltaText(accum.content, delta.content);
  accum.reasoning = appendDeltaText(accum.reasoning, delta.reasoning);
}

function parseSseJsonPayload(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const data = trimmed.slice(5).trim();
  if (!data || data === '[DONE]') return null;

  try {
    const parsed = JSON.parse(data) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

async function readOpenRouterSseStream(
  body: ReadableStream<Uint8Array>,
  onGenerationId?: (generationId: string) => void | Promise<void>,
): Promise<StreamAccumulation> {
  const accum: StreamAccumulation = { content: '', reasoning: '' };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const chunk = parseSseJsonPayload(line);
        if (!chunk) continue;

        applyStreamChunk(accum, chunk);

        if (accum.generationId && onGenerationId) {
          await onGenerationId(accum.generationId);
        }
      }
    }

    if (buffer.trim()) {
      const chunk = parseSseJsonPayload(buffer);
      if (chunk) {
        applyStreamChunk(accum, chunk);
        if (accum.generationId && onGenerationId) {
          await onGenerationId(accum.generationId);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accum;
}

function streamResultToCompletion(
  accum: StreamAccumulation,
  model: string,
): OpenRouterChatCompletionResult {
  const content = accum.content.trim();
  if (!content) {
    throw new Error('Invalid AI response: missing content');
  }

  const message: Record<string, unknown> = {
    role: 'assistant',
    content,
    ...(accum.reasoning.trim() ? { reasoning: accum.reasoning.trim() } : {}),
  };

  const raw: Record<string, unknown> = {
    id: accum.generationId ?? 'unknown',
    object: 'chat.completion',
    model: accum.model ?? model,
    choices: [{ index: 0, message, finish_reason: 'stop' }],
    ...(accum.usage ? { usage: accum.usage } : {}),
  };

  return { content, message, raw };
}

function recoveredToCompletion(
  recovered: OpenRouterRecoveredCompletion,
): OpenRouterChatCompletionResult {
  return {
    content: recovered.content,
    message: recovered.message,
    raw: recovered.raw,
  };
}

async function persistGenerationIdForJob(generationId: string): Promise<void> {
  const ctx = getAiJobRunContext();
  if (!ctx) return;
  await saveOpenRouterPendingGeneration(ctx.jobId, generationId, ctx.messageTtlSeconds);
}

async function tryRecoverByGenerationId(
  generationId: string,
  model: string,
): Promise<OpenRouterChatCompletionResult | null> {
  const recovered = await pollOpenRouterGenerationContent(generationId);
  if (!recovered) return null;

  const ctx = getAiJobRunContext();
  if (ctx) {
    await clearOpenRouterPendingGeneration(ctx.jobId);
  }

  console.info('[OpenRouter recovery] recovered after transport failure', {
    jobId: ctx?.jobId,
    generationId,
    model,
  });

  return recoveredToCompletion(recovered);
}

export async function sendOpenRouterChatCompletion(
  params: SendOpenRouterChatCompletionParams,
): Promise<OpenRouterChatCompletionResult> {
  const model = params.model.trim();
  const jobCtx = getAiJobRunContext();

  if (jobCtx) {
    const pending = await tryRecoverOpenRouterPendingGeneration(jobCtx.jobId);
    if (pending) {
      return recoveredToCompletion(pending);
    }
  }

  let generationIdFromHeaders: string | undefined;
  let savedGenerationId = false;

  const saveGenerationIdOnce = async (generationId: string) => {
    if (savedGenerationId) return;
    savedGenerationId = true;
    generationIdFromHeaders = generationId;
    await persistGenerationIdForJob(generationId);
  };

  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: buildRequestHeaders(params.clientUserAgent),
      body: JSON.stringify(buildRequestBody(params)),
    });

    const headerGenerationId = readOpenRouterGenerationId(response.headers);
    if (headerGenerationId) {
      await saveGenerationIdOnce(headerGenerationId);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      const err = new Error(
        `OpenRouter chat failed (${response.status}): ${errBody.slice(0, 300)}`,
      );
      if (headerGenerationId) {
        const recovered = await tryRecoverByGenerationId(headerGenerationId, model);
        if (recovered) return recovered;
      }
      throw err;
    }

    if (!response.body) {
      throw new Error('OpenRouter chat failed: empty response body');
    }

    const accum = await readOpenRouterSseStream(response.body, saveGenerationIdOnce);
    const generationId = accum.generationId ?? generationIdFromHeaders;
    if (generationId && jobCtx) {
      await clearOpenRouterPendingGeneration(jobCtx.jobId);
    }

    return streamResultToCompletion(accum, model);
  } catch (err) {
    const generationId = generationIdFromHeaders;
    if (generationId && isOpenRouterRecoverableTransportError(err)) {
      const recovered = await tryRecoverByGenerationId(generationId, model);
      if (recovered) return recovered;
    }

    if (jobCtx && isOpenRouterRecoverableTransportError(err)) {
      const pending = await tryRecoverOpenRouterPendingGeneration(jobCtx.jobId, {
        maxWaitMs: 60_000,
      });
      if (pending) {
        return recoveredToCompletion(pending);
      }
    }

    throw err;
  }
}
