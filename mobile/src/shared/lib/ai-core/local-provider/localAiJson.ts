import { isRecord, isString } from '@/shared/lib/type-guards';

import type { AskAnswerKind, AskAnswerResult, AskEvidence } from '../types';
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
        if (isRecord(parsed)) {
          return parsed;
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

const ASK_ANSWER_KINDS = new Set<AskAnswerKind>(['plain', 'list', 'tasks', 'decisions']);
const ASK_ITEMS_MAX = 12;
const ASK_ITEM_MAX_CHARS = 500;
const ASK_EVIDENCE_MAX = 5;
const ASK_EVIDENCE_QUOTE_MAX_CHARS = 500;
const ASK_EVIDENCE_LABEL_MAX_CHARS = 120;

function sanitizeAskAnswerKind(value: unknown): AskAnswerKind | undefined {
  return isString(value) && ASK_ANSWER_KINDS.has(value as AskAnswerKind)
    ? (value as AskAnswerKind)
    : undefined;
}

function sanitizeAskItems(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((item) => (isString(item) ? item.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .slice(0, ASK_ITEMS_MAX)
    .map((item) => item.slice(0, ASK_ITEM_MAX_CHARS));
  return out.length ? out : undefined;
}

function sanitizeAskEvidence(value: unknown): AskEvidence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: AskEvidence[] = [];

  for (const item of value.slice(0, ASK_EVIDENCE_MAX)) {
    if (!isRecord(item)) continue;
    const quote = isString(item.quote) ? item.quote.replace(/\s+/g, ' ').trim() : '';
    if (!quote) continue;
    const source = isString(item.source) ? item.source : undefined;
    const label = isString(item.label)
      ? item.label.replace(/\s+/g, ' ').trim().slice(0, ASK_EVIDENCE_LABEL_MAX_CHARS)
      : undefined;
    const offsetMs =
      typeof item.offsetMs === 'number' && Number.isFinite(item.offsetMs)
        ? Math.max(0, Math.round(item.offsetMs))
        : item.offsetMs === null
          ? null
          : undefined;

    out.push({
      quote: quote.slice(0, ASK_EVIDENCE_QUOTE_MAX_CHARS),
      ...(source ? { source: source as AskEvidence['source'] } : {}),
      ...(offsetMs !== undefined ? { offsetMs } : {}),
      ...(label ? { label } : {}),
    });
  }

  return out.length ? out : undefined;
}

function tryParseAskJsonAnswer(raw: string): AskAnswerResult | null {
  const trimmed = stripMarkdownCodeFence(raw.trim());

  if (!trimmed) return null;

  const fromBrace = sliceFromFirstBrace(trimmed);
  const blob = extractBalancedJsonObject(fromBrace) ?? extractJsonObjectLoose(fromBrace);

  if (!blob) return null;

  const attempts = [blob, repairCommonJsonIssues(blob)];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as { answer?: unknown };
      if (isString(parsed.answer)) {
        const a = parsed.answer.trim();
        if (a.length > 0) {
          const answerKind = sanitizeAskAnswerKind((parsed as Record<string, unknown>).answerKind);
          const items = sanitizeAskItems((parsed as Record<string, unknown>).items);
          const evidence = sanitizeAskEvidence((parsed as Record<string, unknown>).evidence);
          return {
            answer: a,
            ...(answerKind ? { answerKind } : {}),
            ...(items ? { items } : {}),
            ...(evidence ? { evidence } : {}),
          };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function tryExtractAnswerFromTruncatedAskJson(raw: string): AskAnswerResult | null {
  const t = stripMarkdownCodeFence(raw.trim());
  const keyMatch = /"answer"\s*:\s*"/i.exec(t);
  if (!keyMatch) return null;

  let i = keyMatch.index + keyMatch[0].length;
  let out = '';

  while (i < t.length) {
    const c = t[i];
    if (c === '\\') {
      if (i + 1 >= t.length) break;
      const n = t[i + 1];
      if (n === 'n') out += '\n';
      else if (n === 'r') out += '\r';
      else if (n === 't') out += '\t';
      else out += n;
      i += 2;
      continue;
    }
    if (c === '"') {
      const rest = t.slice(i + 1).trimStart();
      if (rest === '' || rest.startsWith('}') || rest.startsWith(',')) {
        const answer = out.trim();
        return answer ? { answer } : null;
      }
      out += c;
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }

  const answer = out.trim();
  return answer ? { answer } : null;
}

/**
 * Structured JSON answer when present; plain text only when clearly usable.
 */
export function parseLocalAskResponse(raw: string): AskAnswerResult | null {
  const jsonAnswer = tryParseAskJsonAnswer(raw);

  if (jsonAnswer !== null) return jsonAnswer;

  const truncated = tryExtractAnswerFromTruncatedAskJson(raw);
  if (truncated !== null) return truncated;

  const trimmed = stripMarkdownCodeFence(raw.trim());
  if (isPlausiblePlainAnswer(trimmed)) {
    return { answer: trimmed.trim() };
  }

  return null;
}
