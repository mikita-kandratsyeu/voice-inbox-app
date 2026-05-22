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

/** Keeps each model call within a predictable duration/output size; full transcript is reassembled. */
const TRANSLATE_CHUNK_MAX_CHARS = 2000;

function splitLargeParagraph(paragraph: string, maxChars: number): string[] {
  const p = paragraph.trim();
  if (p.length <= maxChars) {
    return [p];
  }

  const parts: string[] = [];
  let rest = p;

  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    let cut = window.lastIndexOf(' ');
    if (cut < Math.floor(maxChars * 0.45)) {
      cut = maxChars;
    }
    const piece = rest.slice(0, cut).trimEnd();
    if (!piece) {
      parts.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars).trimStart();
      continue;
    }
    parts.push(piece);
    rest = rest.slice(cut).trimStart();
  }

  if (rest) {
    parts.push(rest);
  }

  return parts;
}

/**
 * Splits on paragraph breaks first, then word-bounded slices so each chunk fits `TRANSLATE_CHUNK_MAX_CHARS`.
 * `separators[i]` is inserted after translated chunk `i` (last is always "").
 */
function splitTranscriptForChunkedTranslation(full: string): {
  chunks: string[];
  separators: string[];
} {
  const normalized = full.replace(/\r\n/g, '\n');
  const paragraphs = normalized
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    const t = normalized.trim();
    return { chunks: [t || full], separators: [''] };
  }

  const chunks: string[] = [];
  const separators: string[] = [];

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const subs = splitLargeParagraph(paragraphs[pi], TRANSLATE_CHUNK_MAX_CHARS);
    for (let si = 0; si < subs.length; si++) {
      chunks.push(subs[si]);
      const lastInPara = si === subs.length - 1;
      const sep = !lastInPara ? ' ' : pi < paragraphs.length - 1 ? '\n\n' : '';
      separators.push(sep);
    }
  }

  return { chunks, separators };
}

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
    const shouldTryNext = (err: unknown) =>
      isRetryableOpenRouterTransportError(err) ||
      (err instanceof Error && err.message.includes('Invalid translation'));

    const { chunks, separators } = splitTranscriptForChunkedTranslation(transcript);

    const translatedParts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const piece = await withSequentialModelFallback(
        models,
        (m) => callTranslate(chunks[i], targetLanguage, m, clientUserAgent),
        shouldTryNext,
      );
      translatedParts.push(piece);
    }

    const translatedText = translatedParts
      .map((t, i) => `${t}${separators[i] ?? ''}`)
      .join('')
      .trim();

    return { ok: true, translatedText };
  } catch (err) {
    await decrement(deviceId);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Translation failed',
    };
  }
}
