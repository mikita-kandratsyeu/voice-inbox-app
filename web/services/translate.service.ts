import {
  filterModelsForAiChat,
  isRetryableAiChatTransportError,
  sendAiChatCompletion,
} from '@/lib/ai-chat';
import { isDeepSeekOpenRouterModel } from '@/lib/deepseek';
import { withSequentialModelFallback } from '@/lib/ai-model-fallback';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { updateAiUsageLedgerMetadata } from '@/lib/ai-usage-ledger';
import {
  extractOpenRouterTokenUsage,
  mergeOpenRouterTokenUsage,
  type OpenRouterTokenUsage,
} from '@/lib/openrouter-token-usage';
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
  | { ok: true; translatedText: string; tokenUsage?: OpenRouterTokenUsage }
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
): Promise<{ translated: string; tokenUsage?: OpenRouterTokenUsage }> {
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

  const { content, raw } = await sendAiChatCompletion({
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

  return {
    translated: content.trim(),
    ...(extractOpenRouterTokenUsage(raw) ? { tokenUsage: extractOpenRouterTokenUsage(raw) } : {}),
  };
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
): Promise<{ translated: string; tokenUsage?: OpenRouterTokenUsage }> {
  return withSequentialModelFallback(
    models,
    async (m) => {
      const result = await callTranslate(chunk, targetLanguage, m, chunkOptions);
      const translated = result.translated;
      if (isSuspiciouslyShortTranslation(chunk, translated)) {
        throw new Error('Suspiciously short translation');
      }
      return result;
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
  const modelForHistory = TRANSLATE_MODEL_CHAIN[0];
  const limitResult = await checkAndIncrement(deviceId, undefined, 1, {
    operation: 'translate',
    metadata: {
      ...aiModelResponseFields(modelForHistory),
      targetLanguage,
      sourceLanguage: translateOptions?.sourceLanguage,
    },
  });
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
    let tokenUsage: OpenRouterTokenUsage | undefined;
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

      tokenUsage = mergeOpenRouterTokenUsage(tokenUsage, piece.tokenUsage);
      translatedParts.push(piece.translated);
      priorSource = `${priorSource}${i > 0 ? (separators[i - 1] ?? '') : ''}${chunks[i]}`;
      priorTranslation = `${priorTranslation}${i > 0 ? (separators[i - 1] ?? '') : ''}${piece.translated}`;
    }

    const translatedText = normalizeTranslatedTranscript(
      translatedParts.map((t, i) => `${t}${separators[i] ?? ''}`).join(''),
    );

    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: 'translate',
      entryId: limitResult.ledgerEntryId,
      metadata: {
        ...aiModelResponseFields(modelForHistory),
        targetLanguage,
        sourceLanguage: translateOptions?.sourceLanguage,
        ...(tokenUsage ? { tokenUsage } : {}),
      },
    });

    return { ok: true, translatedText, ...(tokenUsage ? { tokenUsage } : {}) };
  } catch (err) {
    await decrement(deviceId, {
      operation: 'translate',
      metadata: { targetLanguage, sourceLanguage: translateOptions?.sourceLanguage },
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Translation failed',
    };
  }
}
