import {
  filterModelsForAiChat,
  isRetryableAiChatTransportError,
  sendAiChatCompletion,
} from '@/lib/ai-chat';
import { isDeepSeekOpenRouterModel } from '@/lib/deepseek';
import { withSequentialModelFallback } from '@/lib/ai-model-fallback';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { buildTranslatePrompt, buildTranslateUserMessage, type ValidLanguage } from '@/lib/prompts';
import { sendLimitExceededPush } from '@/lib/push-tokens';
import {
  buildTranslateChunkContext,
  isSuspiciouslyShortTranslation,
  normalizeTranslatedTranscript,
  resolveTranscriptTextForTranslation,
  splitTranscriptForChunkedTranslation,
  type TranslateTranscriptSegment,
} from '@/lib/translate-chunking';
import { TRANSLATE_MODEL_CHAIN } from '@/config/constants';

type TranslateResult =
  | { ok: true; translatedText: string }
  | { ok: false; limitExceeded: true; usage: import('@/lib/ai-rate-limit').AiUsage }
  | { ok: false; error: string };

export type TranslateTranscriptOptions = {
  sourceLanguage?: ValidLanguage;
  transcriptSegments?: TranslateTranscriptSegment[];
};

async function callTranslate(
  chunk: string,
  targetLanguage: string,
  model: string,
  options: {
    sourceLanguage?: ValidLanguage;
    isContinuation: boolean;
    clientUserAgent?: string | null;
    deviceId?: string;
    priorSourceTail?: string;
    priorTranslationTail?: string;
  },
): Promise<string> {
  const systemPrompt = buildTranslatePrompt({
    targetLangCode: targetLanguage,
    sourceLangCode: options.sourceLanguage,
    isContinuation: options.isContinuation,
  });

  const userContent = buildTranslateUserMessage(
    chunk,
    options.priorSourceTail
      ? {
          priorSourceTail: options.priorSourceTail,
          priorTranslationTail: options.priorTranslationTail ?? '',
        }
      : undefined,
  );

  const { content } = await sendAiChatCompletion({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: isDeepSeekOpenRouterModel(model) ? undefined : 0.2,
    clientUserAgent: options.clientUserAgent,
    userId: options.deviceId,
  });

  if (!content.trim()) {
    throw new Error('Invalid translation response');
  }

  return content.trim();
}

function shouldRetryTranslation(err: unknown): boolean {
  return (
    isRetryableAiChatTransportError(err) ||
    (err instanceof Error &&
      (err.message.includes('Invalid translation') ||
        err.message.includes('Suspiciously short translation')))
  );
}

async function translateChunkWithFallback(
  chunk: string,
  targetLanguage: string,
  models: string[],
  chunkOptions: {
    sourceLanguage?: ValidLanguage;
    isContinuation: boolean;
    clientUserAgent?: string | null;
    deviceId?: string;
    priorSourceTail?: string;
    priorTranslationTail?: string;
  },
): Promise<string> {
  return withSequentialModelFallback(
    models,
    async (m) => {
      const translated = await callTranslate(chunk, targetLanguage, m, chunkOptions);
      if (isSuspiciouslyShortTranslation(chunk, translated)) {
        throw new Error('Suspiciously short translation');
      }
      return translated;
    },
    shouldRetryTranslation,
  );
}

export async function translateTranscript(
  transcript: string,
  targetLanguage: string,
  deviceId: string,
  clientUserAgent?: string | null,
  translateOptions?: TranslateTranscriptOptions,
): Promise<TranslateResult> {
  const limitResult = await checkAndIncrement(deviceId);
  if (!limitResult.allowed) {
    await sendLimitExceededPush(deviceId);
    return { ok: false, limitExceeded: true, usage: limitResult.usage };
  }

  try {
    const models = filterModelsForAiChat([...TRANSLATE_MODEL_CHAIN]);
    const sourceLanguage = translateOptions?.sourceLanguage;
    const fullText = resolveTranscriptTextForTranslation(
      transcript,
      translateOptions?.transcriptSegments,
    );

    const { chunks, separators } = splitTranscriptForChunkedTranslation(fullText);

    const translatedParts: string[] = [];
    let priorSource = '';
    let priorTranslation = '';

    for (let i = 0; i < chunks.length; i++) {
      const isContinuation = i > 0;
      const ctx = isContinuation
        ? buildTranslateChunkContext(priorSource, priorTranslation)
        : undefined;

      const piece = await translateChunkWithFallback(chunks[i], targetLanguage, models, {
        sourceLanguage,
        isContinuation,
        clientUserAgent,
        deviceId,
        priorSourceTail: ctx?.priorSourceTail,
        priorTranslationTail: ctx?.priorTranslationTail,
      });

      translatedParts.push(piece);
      priorSource = `${priorSource}${i > 0 ? (separators[i - 1] ?? '') : ''}${chunks[i]}`;
      priorTranslation = `${priorTranslation}${i > 0 ? (separators[i - 1] ?? '') : ''}${piece}`;
    }

    const translatedText = normalizeTranslatedTranscript(
      translatedParts.map((t, i) => `${t}${separators[i] ?? ''}`).join(''),
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
