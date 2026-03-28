import { LocalAiError } from './localAiErrors';

export function repairCommonJsonIssues(blob: string): string {
  return blob.replace(/,(\s*[}\]])/g, '$1');
}

export function stripMarkdownCodeFence(text: string): string {
  let s = text.trim();
  const fullBlock = /^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i.exec(s);

  if (fullBlock) {
    return fullBlock[1].trim();
  }

  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\r?\n?/i, '');
    const close = s.lastIndexOf('```');
    if (close >= 0) {
      s = s.slice(0, close);
    }
    s = s.trim();
  }

  return s;
}

function sliceFromFirstBrace(s: string): string {
  const i = s.indexOf('{');

  return i >= 0 ? s.slice(i) : s;
}

export function extractBalancedJsonObject(s: string): string | null {
  const start = s.indexOf('{');

  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function extractJsonObjectLoose(s: string): string | null {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');

  if (start < 0 || end <= start) return null;

  return s.slice(start, end + 1);
}

function collectJsonObjectCandidates(cleaned: string): string[] {
  const trimmed = cleaned.trim();
  const out: string[] = [];
  const push = (str: string | null | undefined) => {
    if (str && !out.includes(str)) out.push(str);
  };

  push(trimmed);

  const fromBrace = sliceFromFirstBrace(trimmed);
  push(fromBrace);

  const balanced = extractBalancedJsonObject(fromBrace);
  push(balanced);

  const loose = extractJsonObjectLoose(fromBrace);
  push(loose);

  return out;
}

export function parseJsonObjectWithFallbacks(raw: string): Record<string, unknown> {
  const cleaned = stripMarkdownCodeFence(raw.trim());
  const trimmed = cleaned.trim();

  // If the model returns a JSON array, do not unwrap the first object — callers expect one object.
  if (trimmed.startsWith('[')) {
    try {
      const top: unknown = JSON.parse(trimmed);
      if (Array.isArray(top)) {
        throw new LocalAiError('parse_failed', 'Invalid local summary response');
      }
    } catch (e) {
      if (e instanceof LocalAiError) throw e;
      // Invalid as a whole value; continue with brace-based extraction (e.g. truncated `[{...`).
    }
  }

  const candidates = collectJsonObjectCandidates(cleaned);
  let lastError: unknown;

  for (const blob of candidates) {
    const attempts = [blob, repairCommonJsonIssues(blob)];
    for (const attempt of attempts) {
      try {
        const parsed: unknown = JSON.parse(attempt);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch (e) {
        lastError = e;
      }
    }
  }

  if (lastError instanceof SyntaxError) {
    throw new LocalAiError('parse_failed', 'Invalid local summary response', {
      cause: lastError,
    });
  }
  throw new LocalAiError('parse_failed', 'Invalid local summary response');
}

const MAX_PLAIN_ANSWER_CHARS = 12_000;

function hasLetterOrNumber(t: string): boolean {
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c >= 48 && c <= 57) return true;
    if (c >= 65 && c <= 90) return true;
    if (c >= 97 && c <= 122) return true;
    if (c > 127) return true;
  }

  return false;
}

function isPlausiblePlainAnswer(text: string): boolean {
  const t = text.trim();

  if (t.length === 0 || t.length > MAX_PLAIN_ANSWER_CHARS) return false;
  if (t.startsWith('{') || t.startsWith('[')) return false;
  if (!hasLetterOrNumber(t)) return false;

  let ctrl = 0;

  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) ctrl += 1;
  }

  if (ctrl / t.length > 0.05) return false;

  return true;
}

function tryParseAskJsonAnswer(raw: string): string | null {
  const trimmed = stripMarkdownCodeFence(raw.trim());

  if (!trimmed) return null;

  const fromBrace = sliceFromFirstBrace(trimmed);
  const blob = extractBalancedJsonObject(fromBrace) ?? extractJsonObjectLoose(fromBrace);

  if (!blob) return null;

  const attempts = [blob, repairCommonJsonIssues(blob)];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as { answer?: unknown };
      if (typeof parsed.answer === 'string') {
        const a = parsed.answer.trim();
        if (a.length > 0) return a;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Structured JSON answer when present; plain text only when clearly usable.
 */
export function parseLocalAskResponse(raw: string): string | null {
  const jsonAnswer = tryParseAskJsonAnswer(raw);

  if (jsonAnswer !== null) return jsonAnswer;

  const trimmed = stripMarkdownCodeFence(raw.trim());
  if (isPlausiblePlainAnswer(trimmed)) {
    return trimmed.trim();
  }

  return null;
}
