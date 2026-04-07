import {
  isRetryableOpenRouterTransportError,
  withSequentialModelFallback,
} from '@/lib/ai-model-fallback';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { buildTranslatePrompt } from '@/lib/prompts';
import { sendLimitExceededPush } from '@/lib/push-tokens';
import { SYSTEM_MICRO_TASK_MODEL, SYSTEM_TASK_MODEL_FALLBACK_CHAIN } from '@/config/constants';
import { createOpenRouterClient } from '@/lib/openrouter';

type TranslateResult =
  | { ok: true; translatedText: string }
  | { ok: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { ok: false; error: string };

async function callTranslate(
  transcript: string,
  targetLang: string,
  model: string,
  clientUserAgent?: string | null,
): Promise<string> {
  const systemPrompt = buildTranslatePrompt(targetLang);
  const client = createOpenRouterClient(clientUserAgent);

  const response = await client.chat.send({
    chatGenerationParams: {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      provider: { zdr: true },
      temperature: 0.2,
      stream: false,
    },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Invalid translation response');
  }

  return content.trim();
}

export async function translateTranscript(
  transcript: string,
  targetLanguage: string,
  deviceId: string,
  clientUserAgent?: string | null,
): Promise<TranslateResult> {
  const limitResult = await checkAndIncrement(deviceId);
  if (!limitResult.allowed) {
    await sendLimitExceededPush(deviceId);
    return { ok: false, limitExceeded: true, usage: limitResult.usage };
  }

  try {
    const models = [SYSTEM_MICRO_TASK_MODEL, ...SYSTEM_TASK_MODEL_FALLBACK_CHAIN];
    const translatedText = await withSequentialModelFallback(
      models,
      (m) => callTranslate(transcript, targetLanguage, m, clientUserAgent),
      (err) =>
        isRetryableOpenRouterTransportError(err) ||
        (err instanceof Error && err.message.includes('Invalid translation')),
    );
    return { ok: true, translatedText };
  } catch (err) {
    await decrement(deviceId);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Translation failed',
    };
  }
}
