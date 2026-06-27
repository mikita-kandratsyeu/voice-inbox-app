const normalizeToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const MAX_REPEATED_TOKEN_RUN = 5;
const WHISPER_HALLUCINATION_SCRIPTS = /[\u0C00-\u0C7F\u0F00-\u0FFF]/u;
const WHISPER_SPECIAL_TOKEN_PATTERN = /<\|[^|>]*\|>/gu;

/** Removes Whisper control tokens such as <|ru|>, <|transcribe|>, <|12.34|>. */
export const stripWhisperSpecialTokens = (text: string): string =>
  text.replace(WHISPER_SPECIAL_TOKEN_PATTERN, ' ').replace(/\s+/gu, ' ').trim();

const hasExcessiveRepeatedTokenRun = (text: string): boolean => {
  const tokens = text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 0);

  let previous = '';
  let run = 0;
  for (const token of tokens) {
    run = token === previous ? run + 1 : 1;
    previous = token;
    if (run >= MAX_REPEATED_TOKEN_RUN) return true;
  }

  return false;
};

const hasExcessiveCharRepetition = (text: string): boolean => {
  const compact = text.replace(/\s+/gu, '');
  if (compact.length < 8) return false;
  if (/(.)\1{7,}/u.test(compact)) return true;
  if (/(.{2})\1{5,}/u.test(compact)) return true;
  if (/(.{3})\1{4,}/u.test(compact)) return true;
  return false;
};

const hasLowLexicalDiversity = (text: string): boolean => {
  const compact = text.replace(/\s+/gu, '');
  if (compact.length < 24) return false;
  const unique = new Set([...compact]).size;
  return unique / compact.length < 0.12;
};

const isWhisperSoundMarker = (text: string): boolean => {
  const trimmed = text.trim();
  return /^\*[^*\n]{1,80}\*$/u.test(trimmed) || /^\[[^\]\n]{1,80}\]$/u.test(trimmed);
};

/** Rejects empty, looping, foreign-script, and non-speech Whisper artifacts. */
export const isUsableTranscriptText = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (isWhisperSoundMarker(trimmed)) return false;
  if (WHISPER_HALLUCINATION_SCRIPTS.test(trimmed)) return false;
  if (hasExcessiveCharRepetition(trimmed)) return false;
  if (hasExcessiveRepeatedTokenRun(trimmed)) return false;
  if (hasLowLexicalDiversity(trimmed)) return false;

  const meaningfulChars = trimmed.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (trimmed.length >= 8 && meaningfulChars / trimmed.length < 0.25) return false;

  return true;
};

/**
 * Collapses 3+ consecutive identical word tokens (stutter artifacts).
 * Two repeats are preserved.
 */
export const collapseRepeatedTokenStutters = (text: string): string => {
  const tokens = text.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) return '';

  const result: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    const normalized = normalizeToken(token);
    const isAlpha = normalized.length > 0 && /^[\p{L}]+$/u.test(normalized);

    if (!isAlpha) {
      result.push(token);
      index += 1;
      continue;
    }

    let run = 1;
    while (index + run < tokens.length) {
      if (normalizeToken(tokens[index + run]) !== normalized) break;
      run += 1;
    }

    if (run >= 3) {
      result.push(token);
      index += run;
      continue;
    }

    for (let offset = 0; offset < run; offset += 1) {
      result.push(tokens[index + offset]);
    }
    index += run;
  }

  return result.join(' ');
};

/** Normalizes segment text from any Whisper runtime before saving or displaying. */
export const cleanTranscriptSegmentText = (text: string): string =>
  collapseRepeatedTokenStutters(stripWhisperSpecialTokens(text));
