import { i18n } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';
import { getIosVersion, IS_IOS } from '@/shared/lib/platform';

const MAX_TEXT_LENGTH = 2000;

export function getEmbeddingLanguage(): string {
  const lang = i18n.language ?? 'en';

  return lang.startsWith('ru') ? 'ru' : 'en';
}

const AppleEmbeddings = IS_IOS ? require('@react-native-ai/apple').AppleEmbeddings : null;

function truncateForEmbedding(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;

  return text.slice(0, MAX_TEXT_LENGTH);
}

const APPLE_EMBEDDINGS_MIN_IOS = 17;

let preparedLanguage: string | null = null;

export function isEmbeddingAvailable(): boolean {
  if (!IS_IOS) return false;

  const version = getIosVersion();
  return version >= APPLE_EMBEDDINGS_MIN_IOS;
}

export async function prepareEmbeddingModel(language: string): Promise<void> {
  if (!IS_IOS || !AppleEmbeddings) {
    return;
  }

  if (preparedLanguage === language) {
    return;
  }

  try {
    await AppleEmbeddings.prepare(language);
    preparedLanguage = language;
  } catch (err) {
    diagWarn('[embeddings] prepare failed:', err);
  }
}

export async function generateEmbedding(text: string, language: string): Promise<number[] | null> {
  if (!IS_IOS || !AppleEmbeddings) return null;

  const trimmed = truncateForEmbedding(text).trim();

  if (!trimmed) return null;

  try {
    const [embedding] = await AppleEmbeddings.generateEmbeddings([trimmed], language);
    return embedding ?? null;
  } catch (err) {
    diagWarn('[embeddings] generate failed:', err);
    return null;
  }
}

export async function generateEmbeddings(
  texts: string[],
  language: string,
): Promise<(number[] | null)[]> {
  if (!IS_IOS || !AppleEmbeddings) return texts.map(() => null);

  const trimmed = texts.map((t) => truncateForEmbedding(t).trim()).filter(Boolean);

  if (trimmed.length === 0) return texts.map(() => null);

  try {
    const embeddings = await AppleEmbeddings.generateEmbeddings(trimmed, language);
    const result: (number[] | null)[] = [];

    let j = 0;
    for (let i = 0; i < texts.length; i++) {
      if (truncateForEmbedding(texts[i]).trim()) {
        result.push(embeddings[j] ?? null);
        j++;
      } else {
        result.push(null);
      }
    }

    return result;
  } catch (err) {
    diagWarn('[embeddings] generateMany failed:', err);
    return texts.map(() => null);
  }
}

export async function checkEmbeddingAvailability(language: string): Promise<boolean> {
  if (!IS_IOS || !AppleEmbeddings) {
    return false;
  }

  try {
    const info = await AppleEmbeddings.getInfo(language);

    return info.hasAvailableAssets;
  } catch {
    return false;
  }
}
