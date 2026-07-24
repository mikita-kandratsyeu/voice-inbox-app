import { PROMPT_TAIL_LENGTH } from '../config/constants';

const CUSTOM_WORDS_PROMPT_MAX_LENGTH = 120;

const isUsablePromptText = (text: string): boolean => text.trim().length > 0;

export const buildCustomWordsPrompt = (customWords: readonly string[]): string | undefined => {
  const cleaned = customWords.map((word) => word.trim()).filter((word) => word.length > 0);
  if (cleaned.length === 0) return undefined;

  const joined = cleaned.join(', ');
  if (joined.length <= CUSTOM_WORDS_PROMPT_MAX_LENGTH) {
    return joined;
  }

  return joined.slice(0, CUSTOM_WORDS_PROMPT_MAX_LENGTH).trim();
};

export const buildWhisperPrompt = (
  previousText: string,
  customWords: readonly string[] = [],
): string | undefined => {
  const vocabulary = buildCustomWordsPrompt(customWords);
  const tail = previousText.trim().slice(-PROMPT_TAIL_LENGTH).trim();
  const hasTail = isUsablePromptText(tail);

  if (vocabulary && hasTail) {
    return `${vocabulary} ${tail}`.trim();
  }
  if (vocabulary) {
    return vocabulary;
  }
  if (hasTail) {
    return tail;
  }

  return undefined;
};
