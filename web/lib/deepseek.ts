import { AI_MODEL_DEEPSEEK_V4_FLASH, normalizeIncomingAiModel } from '@/config/constants';

const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions';

/** DeepSeek API model id (not the OpenRouter catalog id). */
export const DEEPSEEK_API_MODEL_V4_FLASH = 'deepseek-v4-flash';

export type DeepSeekChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type DeepSeekChatCompletionParams = {
  messages: DeepSeekChatMessage[];
  jsonObject?: boolean;
  /** When true, request thinking mode and return `reasoning_content`. */
  withReasoning?: boolean;
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

export function deepSeekDirectApiConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export function isDeepSeekOpenRouterModel(model: string): boolean {
  return normalizeIncomingAiModel(model.trim()) === AI_MODEL_DEEPSEEK_V4_FLASH;
}

export function shouldCallDeepSeekDirect(model: string): boolean {
  return deepSeekDirectApiConfigured() && isDeepSeekOpenRouterModel(model);
}

export function isRetryableDeepSeekTransportError(err: unknown): boolean {
  if (err instanceof DeepSeekApiError) {
    const s = err.status;
    return s === 429 || s === 502 || s === 503 || s === 504;
  }

  return err instanceof TypeError;
}

export async function deepSeekChatCompletion(
  params: DeepSeekChatCompletionParams,
): Promise<DeepSeekChatCompletionResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new DeepSeekApiError('DEEPSEEK_API_KEY is not configured');
  }

  const body: Record<string, unknown> = {
    model: DEEPSEEK_API_MODEL_V4_FLASH,
    messages: params.messages,
    stream: false,
  };

  if (params.jsonObject) {
    body.response_format = { type: 'json_object' };
  }

  if (params.withReasoning) {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = 'high';
  } else {
    body.thinking = { type: 'disabled' };
  }

  const res = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new DeepSeekApiError(
      `DeepSeek API returned non-JSON (${res.status})`,
      res.status,
    );
  }

  if (!res.ok) {
    const errMsg =
      typeof raw.error === 'object' &&
      raw.error &&
      typeof (raw.error as { message?: unknown }).message === 'string'
        ? String((raw.error as { message: string }).message)
        : `DeepSeek API error (${res.status})`;
    throw new DeepSeekApiError(errMsg, res.status);
  }

  const choices = raw.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new DeepSeekApiError('DeepSeek API response missing choices');
  }

  const first = choices[0];
  if (!first || typeof first !== 'object') {
    throw new DeepSeekApiError('DeepSeek API response invalid choice');
  }

  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') {
    throw new DeepSeekApiError('DeepSeek API response missing message');
  }

  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (typeof content !== 'string') {
    throw new DeepSeekApiError('DeepSeek API response missing content');
  }

  return {
    message: msg,
    content,
    raw,
  };
}
