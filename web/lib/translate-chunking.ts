export type TranslateTranscriptSegment = {
  startMs?: number;
  endMs?: number;
  text: string;
};

const DEFAULT_TRANSLATE_CHUNK_MAX_CHARS = 4_000;
const PRIOR_SOURCE_CONTEXT_CHARS = 320;
const PRIOR_TRANSLATION_CONTEXT_CHARS = 180;

/** Line starts with a speaker label or segment timestamp — keep intact when packing chunks. */
const SPEAKER_OR_TIMESTAMP_LINE_RE =
  /^(?:\[[\d:]+\]|\d{1,2}:\d{2}(?::\d{2})?(?:\s*[–-]\s*\d{1,2}:\d{2}(?::\d{2})?)?\]|(?:Speaker|Участник|Спикер|Participante|Intervenant)\s*\d+\s*:)/i;

const SENTENCE_BOUNDARY_RE = /(?<=[.!?…])\s+(?=[A-ZА-ЯЁІЇЄҐ0-9"([])/u;

function formatClockFromMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '?';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function readTranslateChunkMaxChars(): number {
  const raw = process.env.TRANSLATE_CHUNK_MAX_CHARS;
  if (typeof raw !== 'string' || !raw.trim()) {
    return DEFAULT_TRANSLATE_CHUNK_MAX_CHARS;
  }
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 800) {
    return DEFAULT_TRANSLATE_CHUNK_MAX_CHARS;
  }
  return Math.min(n, 12_000);
}

export function getTranslateChunkMaxChars(): number {
  return readTranslateChunkMaxChars();
}

export function tailForTranslateContext(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return t.slice(-maxChars);
}

export type TranslateChunkContext = {
  priorSourceTail: string;
  priorTranslationTail: string;
};

export function buildTranslateChunkContext(
  priorSource: string,
  priorTranslation: string,
): TranslateChunkContext {
  return {
    priorSourceTail: tailForTranslateContext(priorSource, PRIOR_SOURCE_CONTEXT_CHARS),
    priorTranslationTail: tailForTranslateContext(
      priorTranslation,
      PRIOR_TRANSLATION_CONTEXT_CHARS,
    ),
  };
}

/**
 * Prefer timed segment lines when the client sends them; otherwise use the flat transcript.
 */
export function resolveTranscriptTextForTranslation(
  plainTranscript: string,
  segments?: TranslateTranscriptSegment[],
): string {
  const flat = plainTranscript.replace(/\r\n/g, '\n').trim();
  if (!segments?.length) return flat;

  const lines: string[] = [];
  for (const seg of segments) {
    const text = seg.text.replace(/\r\n/g, '\n').trim();
    if (!text) continue;
    const prefix =
      seg.startMs !== undefined && Number.isFinite(seg.startMs) && seg.startMs >= 0
        ? `[${formatClockFromMs(seg.startMs)}] `
        : '';
    lines.push(`${prefix}${text}`);
  }

  const fromSegments = lines.join('\n').trim();
  return fromSegments || flat;
}

function splitByWordBoundary(paragraph: string, maxChars: number): string[] {
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

function splitParagraphIntoSentences(paragraph: string): string[] {
  const trimmed = paragraph.trim();
  if (!trimmed) return [];

  const byLine = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const units: string[] = [];

  for (const line of byLine) {
    if (SPEAKER_OR_TIMESTAMP_LINE_RE.test(line) || line.length <= 120) {
      units.push(line);
      continue;
    }

    const sentences = line.split(SENTENCE_BOUNDARY_RE).map((s) => s.trim()).filter(Boolean);
    if (sentences.length <= 1) {
      units.push(line);
      continue;
    }
    units.push(...sentences);
  }

  return units.length > 0 ? units : [trimmed];
}

function packUnitsIntoChunks(units: string[], maxChars: number, joiner: string): string[] {
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = '';
  };

  for (const unit of units) {
    const candidate = current ? `${current}${joiner}${unit}` : unit;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) flush();

    if (unit.length <= maxChars) {
      current = unit;
      continue;
    }

    const wordParts = splitByWordBoundary(unit, maxChars);
    for (let wi = 0; wi < wordParts.length; wi++) {
      if (wi < wordParts.length - 1) {
        chunks.push(wordParts[wi]);
      } else {
        current = wordParts[wi];
      }
    }
  }

  flush();
  return chunks;
}

function splitLargeParagraph(paragraph: string, maxChars: number): string[] {
  const sentences = splitParagraphIntoSentences(paragraph);
  if (sentences.length <= 1) {
    return splitByWordBoundary(paragraph, maxChars);
  }
  return packUnitsIntoChunks(sentences, maxChars, ' ');
}

/**
 * Splits on paragraph breaks first, then sentence- or line-bounded slices.
 * `separators[i]` is inserted after translated chunk `i` (last is always "").
 */
export function splitTranscriptForChunkedTranslation(full: string): {
  chunks: string[];
  separators: string[];
} {
  const maxChars = readTranslateChunkMaxChars();
  const normalized = full.replace(/\r\n/g, '\n');
  const paragraphs = normalized
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    const t = normalized.trim();
    const single = t || full;
    if (single.length <= maxChars) {
      return { chunks: [single], separators: [''] };
    }
    const parts = splitLargeParagraph(single, maxChars);
    return {
      chunks: parts,
      separators: parts.map((_, i) => (i < parts.length - 1 ? '\n\n' : '')),
    };
  }

  const chunks: string[] = [];
  const separators: string[] = [];

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const subs = splitLargeParagraph(paragraphs[pi], maxChars);
    for (let si = 0; si < subs.length; si++) {
      chunks.push(subs[si]);
      const lastInPara = si === subs.length - 1;
      const sep = !lastInPara ? ' ' : pi < paragraphs.length - 1 ? '\n\n' : '';
      separators.push(sep);
    }
  }

  return { chunks, separators };
}

export function normalizeTranslatedTranscript(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isSuspiciouslyShortTranslation(source: string, translation: string): boolean {
  const s = source.trim();
  const t = translation.trim();
  if (s.length < 120 || t.length === 0) return false;
  return t.length < s.length * 0.22;
}
