import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { openRouterClient } from '@/lib/openrouter';

const TRANSLATE_MODEL = 'google/gemini-2.5-flash-lite';

const LANGUAGE_NAMES: Record<string, string> = {
  ru: 'Russian',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  uk: 'Ukrainian',
  pl: 'Polish',
};

type TranslateResult =
  | { ok: true; translatedText: string }
  | { ok: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { ok: false; error: string };

async function callTranslate(transcript: string, targetLang: string): Promise<string> {
  const langName = LANGUAGE_NAMES[targetLang] ?? targetLang;
  const systemPrompt = `Translate the following text to ${langName}. Preserve the original formatting and structure. Return ONLY the translated text, no explanations.`;

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
