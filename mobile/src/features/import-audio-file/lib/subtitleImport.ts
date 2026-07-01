import type { TranscriptSegment } from '@/entities/record';

const SUBTITLE_EXT_RE = /\.(srt|vtt|sbv|sub)(?:[?#].*)?$/i;
const MAX_SUBTITLE_FILE_CHARS = 2_000_000;
export const MAX_SUBTITLE_IMPORT_CHARS = 500_000;

export type ParsedSubtitleImport = {
  transcript: string;
  segments: TranscriptSegment[];
  durationMs: number;
  charCount: number;
};

function normalizeText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(String.fromCharCode(0))
    .join('')
    .trim();
}

export function isSubtitleImportFileName(name: string | null | undefined): boolean {
  return SUBTITLE_EXT_RE.test(name?.trim() ?? '');
}

export function looksLikeSubtitleContent(raw: string): boolean {
  const text = normalizeText(raw).slice(0, 12_000);
  if (!text) return false;

  if (/^WEBVTT(?:\s|$)/i.test(text)) return true;
  if (/\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}/.test(text)) {
    return true;
  }
  if (/\d{1,2}:\d{2}[,.]\d{1,3}\s*,\s*\d{1,2}:\d{2}[,.]\d{1,3}/.test(text)) {
    return true;
  }

  return false;
}

function parseTimestampMs(raw: string): number | null {
  const match = raw.trim().match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})([,.](\d{1,3}))?/);
  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const fraction = (match[5] ?? '').padEnd(3, '0').slice(0, 3);
  const ms = fraction ? Number(fraction) : 0;

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    !Number.isFinite(ms)
  ) {
    return null;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + ms;
}

function parseTimeRange(line: string): { startMs: number; endMs: number } | null {
  const arrow = line.match(/(.+?)\s*-->\s*(.+)/);
  if (arrow) {
    const startMs = parseTimestampMs(arrow[1] ?? '');
    const endMs = parseTimestampMs((arrow[2] ?? '').split(/\s+/)[0] ?? '');
    if (startMs != null && endMs != null && endMs >= startMs) {
      return { startMs, endMs };
    }
  }

  const sbv = line.match(/^\s*(\d{1,2}:\d{2}[,.]\d{1,3})\s*,\s*(\d{1,2}:\d{2}[,.]\d{1,3})\s*$/);
  if (sbv) {
    const startMs = parseTimestampMs(sbv[1] ?? '');
    const endMs = parseTimestampMs(sbv[2] ?? '');
    if (startMs != null && endMs != null && endMs >= startMs) {
      return { startMs, endMs };
    }
  }

  return null;
}

function cleanCueText(lines: string[]): string {
  return lines
    .map((line) =>
      line
        .replace(/<[^>]+>/g, '')
        .replace(/\{\\[^}]+\}/g, '')
        .replace(/\{[^}]+\}/g, '')
        .trim(),
    )
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSegmentTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function parseSubtitleImport(raw: string): ParsedSubtitleImport | null {
  const text = normalizeText(raw);
  if (!text || text.length > MAX_SUBTITLE_FILE_CHARS) return null;

  const lines = text
    .split('\n')
    .filter((line) => !/^WEBVTT(?:\s|$)/i.test(line.trim()))
    .filter((line) => !/^NOTE(?:\s|$)/i.test(line.trim()));

  const segments: TranscriptSegment[] = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i]?.trim() ?? '';
    if (!line) {
      i += 1;
      continue;
    }

    if (/^\d+$/.test(line) && i + 1 < lines.length) {
      i += 1;
      line = lines[i]?.trim() ?? '';
    }

    const range = parseTimeRange(line);
    if (!range) {
      i += 1;
      continue;
    }

    i += 1;
    const cueLines: string[] = [];
    while (i < lines.length && (lines[i]?.trim() ?? '') !== '') {
      cueLines.push(lines[i] ?? '');
      i += 1;
    }

    const cueText = cleanCueText(cueLines);
    if (cueText) {
      segments.push({
        id: `subtitle-${segments.length + 1}`,
        startTime: formatSegmentTime(range.startMs),
        startMs: range.startMs,
        endMs: range.endMs,
        text: cueText,
      });
    }
  }

  if (segments.length === 0) return null;

  const transcript = segments
    .map((segment) => segment.text)
    .join('\n')
    .trim();
  const durationMs = Math.max(...segments.map((segment) => segment.endMs ?? 0), 1000);

  return { transcript, segments, durationMs, charCount: transcript.length };
}
