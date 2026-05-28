import {
  deepSeekChatCompletion,
  deepSeekDirectApiConfigured,
  isDeepSeekOpenRouterModel,
  isRetryableDeepSeekTransportError,
  type DeepSeekChatMessage,
} from '@/lib/deepseek';
import { isRetryableOpenRouterTransportError } from '@/lib/ai-model-fallback';
import { sendOpenRouterChatCompletion } from '@/lib/openrouter-chat';

export type AiChatMessage = DeepSeekChatMessage;

export type SendAiChatCompletionParams = {
  /** Catalog id from clients (e.g. deepseek/deepseek-v4-flash) or OpenRouter id. */
  model: string;
  messages: AiChatMessage[];
  jsonObject?: boolean;
  /** Summary-style reasoning trace (DeepSeek: thinking enabled; OpenRouter: reasoning effort). */
  withReasoning?: boolean;
  temperature?: number;
  clientUserAgent?: string | null;
  userId?: string | null;
};

export type AiChatCompletionResult = {
  content: string;
  message: unknown;
  raw: unknown;
};

/** Drop DeepSeek from a fallback list when the direct API key is not configured. */
export function filterModelsForAiChat(models: string[]): string[] {
  return models.filter((m) => !isDeepSeekOpenRouterModel(m) || deepSeekDirectApiConfigured());
}

export function isRetryableAiChatTransportError(err: unknown): boolean {
  return isRetryableOpenRouterTransportError(err) || isRetryableDeepSeekTransportError(err);
}

/**
 * Routes DeepSeek catalog models to https://api.deepseek.com; all others to OpenRouter.
 */
export async function sendAiChatCompletion(
  params: SendAiChatCompletionParams,
): Promise<AiChatCompletionResult> {
  const model = params.model.trim();

  if (isDeepSeekOpenRouterModel(model)) {
    if (!deepSeekDirectApiConfigured()) {
      throw new Error('DEEPSEEK_API_KEY is required for DeepSeek models');
    }

    const { content, message, raw } = await deepSeekChatCompletion({
      messages: params.messages,
      jsonObject: params.jsonObject,
      withReasoning: params.withReasoning,
      userId: params.userId,
    });

    return { content, message, raw };
  }

  return sendOpenRouterChatCompletion({
    model,
    messages: params.messages,
    jsonObject: params.jsonObject,
    withReasoning: params.withReasoning,
    temperature: params.temperature,
    clientUserAgent: params.clientUserAgent,
    userId: params.userId,
  });
}
