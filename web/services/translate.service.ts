import { buildTranslatePrompt } from '@/lib/prompts';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { sendLimitExceededPush } from '@/lib/push-tokens';
import { openRouterClient } from '@/lib/openrouter';

const TRANSLATE_MODEL = 'google/gemini-2.5-flash-lite';

type TranslateResult =
  | { ok: true; translatedText: string }
  | { ok: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { ok: false; error: string };

async function callTranslate(transcript: string, targetLang: string): Promise<string> {
  const systemPrompt = buildTranslatePrompt(targetLang);

  const response = await openRouterClient.chat.send({
    chatGenerationParams: {
      model: TRANSLATE_MODEL,
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
): Promise<TranslateResult> {
  const limitResult = await checkAndIncrement(deviceId);
  if (!limitResult.allowed) {
    await sendLimitExceededPush(deviceId);
    return { ok: false, limitExceeded: true, usage: limitResult.usage };
  }

  try {
    const translatedText = await callTranslate(transcript, targetLanguage);
    return { ok: true, translatedText };
  } catch (err) {
    await decrement(deviceId);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Translation failed',
    };
  }
}
