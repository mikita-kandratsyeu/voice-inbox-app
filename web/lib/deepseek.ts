import { AI_MODEL_DEEPSEEK_V4_FLASH, normalizeIncomingAiModel } from '@/config/constants';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

/** DeepSeek API model id (not the OpenRouter catalog id). */
export const DEEPSEEK_API_MODEL_V4_FLASH = 'deepseek-v4-flash';

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

/** Default max output tokens (CoT + answer); see DeepSeek reasoning / pricing docs. */
const DEFAULT_DEEPSEEK_MAX_TOKENS = 32_768;

export type DeepSeekChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type DeepSeekChatCompletionParams = {
  messages: DeepSeekChatMessage[];
  /** `response_format: { type: 'json_object' }` — prompt must mention JSON (our system prompts do). */
  jsonObject?: boolean;
  /** Thinking mode: `reasoning_content` + `content` (docs: thinking defaults to enabled). */
  withReasoning?: boolean;
  /** Per-device scheduling isolation (`user_id`, max 512, `[a-zA-Z0-9\-_]+`). */
  userId?: string | null;
};

export type DeepSeekChatCompletionResult = {
  message: Record<string, unknown>;
  content: string;
  raw: Record<string, unknown>;
};

export class DeepSeekApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'DeepSeekApiError';
    this.status = status;
  }
}

let cachedClient: OpenAI | null = null;
let cachedClientKey: string | null = null;

function readDeepSeekMaxTokens(): number {
  const raw = process.env.DEEPSEEK_MAX_TOKENS;
  if (typeof raw !== 'string' || !raw.trim()) {
    return DEFAULT_DEEPSEEK_MAX_TOKENS;
  }
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_DEEPSEEK_MAX_TOKENS;
  }
  return n;
}

function deepSeekBaseUrl(): string {
  const fromEnv = process.env.DEEPSEEK_BASE_URL?.trim();
  return (fromEnv || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/$/, '');
}

function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new DeepSeekApiError('DEEPSEEK_API_KEY is not configured');
  }

  const baseURL = deepSeekBaseUrl();
  const cacheKey = `${baseURL}\0${apiKey}`;
  if (cachedClient && cachedClientKey === cacheKey) {
    return cachedClient;
  }

  cachedClient = new OpenAI({ apiKey, baseURL });
  cachedClientKey = cacheKey;
  return cachedClient;
}

/** Maps device id to DeepSeek `user_id` (rate-limit isolation). */
export function normalizeDeepSeekUserId(deviceId: string | null | undefined): string | undefined {
  if (typeof deviceId !== 'string') {
    return undefined;
  }

  const trimmed = deviceId.trim().slice(0, 512);
  if (!trimmed) {
    return undefined;
  }

  const sanitized = trimmed.replace(/[^a-zA-Z0-9\-_]/g, '_');
  return sanitized || undefined;
}

export function deepSeekDirectApiConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export function isDeepSeekOpenRouterModel(model: string): boolean {
  return normalizeIncomingAiModel(model) === AI_MODEL_DEEPSEEK_V4_FLASH;
}

export function isRetryableDeepSeekTransportError(err: unknown): boolean {
  if (err instanceof DeepSeekApiError) {
    const s = err.status;
    return s === 429 || s === 500 || s === 502 || s === 503 || s === 504;
  }

  if (err instanceof OpenAI.APIError) {
    const s = err.status;
    return s === 429 || s === 500 || s === 502 || s === 503 || s === 504;
  }

  return err instanceof TypeError;
}

function mapOpenAiError(err: unknown): never {
  if (err instanceof OpenAI.APIError) {
    throw new DeepSeekApiError(err.message, err.status);
  }
  throw err;
}

function readAssistantMessage(response: OpenAI.Chat.Completions.ChatCompletion): {
  message: Record<string, unknown>;
  content: string;
  finishReason: string | null;
} {
  const choice = response.choices[0];
  if (!choice?.message) {
    throw new DeepSeekApiError('DeepSeek API response missing message');
  }

  const msg = choice.message as OpenAI.Chat.Completions.ChatCompletionMessage & {
    reasoning_content?: string | null;
  };

  const content = msg.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new DeepSeekApiError('DeepSeek API returned empty content');
  }

  return {
    message: msg as unknown as Record<string, unknown>,
    content,
    finishReason: choice.finish_reason ?? null,
  };
}

/**
 * Chat Completions via the official OpenAI SDK pointed at DeepSeek
 * (https://api-docs.deepseek.com/ — base_url + thinking in extra_body).
 */
export async function deepSeekChatCompletion(
  params: DeepSeekChatCompletionParams,
): Promise<DeepSeekChatCompletionResult> {
  const client = getDeepSeekClient();
  const thinkingType = params.withReasoning ? 'enabled' : 'disabled';
  const userId = normalizeDeepSeekUserId(params.userId);

  // DeepSeek extends OpenAI Chat Completions (thinking, user_id, reasoning_effort).
  // https://api-docs.deepseek.com/guides/thinking_mode
  const request = {
    model: DEEPSEEK_API_MODEL_V4_FLASH,
    messages: params.messages,
    stream: false as const,
    max_tokens: readDeepSeekMaxTokens(),
    thinking: { type: thinkingType },
    ...(params.jsonObject ? { response_format: { type: 'json_object' as const } } : {}),
    ...(params.withReasoning ? { reasoning_effort: 'high' as const } : {}),
    ...(userId ? { user_id: userId } : {}),
  } as ChatCompletionCreateParamsNonStreaming;

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await client.chat.completions.create(request);
  } catch (err) {
    mapOpenAiError(err);
  }

  const { message, content, finishReason } = readAssistantMessage(response);

  if (finishReason === 'length') {
    throw new DeepSeekApiError('DeepSeek API output truncated (finish_reason=length)');
  }

  return {
    message,
    content,
    raw: response as unknown as Record<string, unknown>,
  };
}
