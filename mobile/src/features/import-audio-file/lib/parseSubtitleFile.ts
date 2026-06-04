import type { TranscriptSegment } from '@/entities/record';

export type ParseSubtitleResult = {
  transcript: string;
  segments: TranscriptSegment[];
  durationMs: number;
};

const CUE_TIMING_RE =
  /^((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})(?:\s+.*)?$/;

const formatTimestampFromMs = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const stripCueMarkup = (text: string): string =>
  text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

export const parseTimestampToMs = (raw: string): number | null => {
  const norm = raw.trim().replace(',', '.');
  const segments = norm.split(':');
  if (segments.length < 2 || segments.length > 3) return null;

  const secParts = segments[segments.length - 1]?.split('.');
  const seconds = Number(secParts?.[0]);
  const millis =
    secParts && secParts.length > 1 ? Number((secParts[1] ?? '0').padEnd(3, '0').slice(0, 3)) : 0;
  if (!Number.isFinite(seconds) || !Number.isFinite(millis)) return null;

  let hours = 0;
  let minutes = 0;
  if (segments.length === 3) {
    hours = Number(segments[0]);
    minutes = Number(segments[1]);
  } else {
    minutes = Number(segments[0]);
  }

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || seconds < 0 || minutes < 0) {
    return null;
  }

  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000 + millis);
};

const buildSegments = (
  cues: { startMs: number; endMs: number; text: string }[],
): ParseSubtitleResult | null => {
  const segments: TranscriptSegment[] = cues
    .map((cue, idx) => ({
      id: String(idx),
      startTime: formatTimestampFromMs(cue.startMs),
      startMs: cue.startMs,
      endMs: cue.endMs,
      text: cue.text,
    }))
    .filter((seg) => seg.text.length > 0);

  if (segments.length === 0) return null;

  const transcript = segments.map((s) => s.text).join('\n');
  const durationMs = Math.max(...segments.map((s) => s.endMs ?? s.startMs ?? 0));

  return { transcript, segments, durationMs };
};

const parseCueBlocks = (blocks: string[]): { startMs: number; endMs: number; text: string }[] => {
  const cues: { startMs: number; endMs: number; text: string }[] = [];

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    let timingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (CUE_TIMING_RE.test(lines[i] ?? '')) {
        timingIdx = i;
        break;
      }
    }
    if (timingIdx < 0) continue;

    const timingMatch = (lines[timingIdx] ?? '').match(CUE_TIMING_RE);
    if (!timingMatch) continue;

    const startMs = parseTimestampToMs(timingMatch[1] ?? '');
    const endMs = parseTimestampToMs(timingMatch[2] ?? '');
    if (startMs == null || endMs == null || endMs <= startMs) continue;

    const textLines = lines.slice(timingIdx + 1);
    const text = stripCueMarkup(textLines.join(' '));
    if (!text) continue;

    cues.push({ startMs, endMs, text });
  }

  return cues;
};

const splitVttBlocks = (content: string): string[] => {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let inHeader = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (inHeader) {
      if (trimmed === '') {
        inHeader = false;
      }
      continue;
    }

    if (trimmed === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'));
        current = [];
      }
      continue;
    }

    if (trimmed.startsWith('NOTE') || trimmed.startsWith('STYLE') || trimmed.startsWith('REGION')) {
      current = [];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'));
  }

  return blocks;
};

const splitSrtBlocks = (content: string): string[] => {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  return normalized
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
};

export function parseSubtitleContent(
  content: string,
  format: 'vtt' | 'srt',
): ParseSubtitleResult | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const resolvedFormat =
    format === 'vtt' || trimmed.startsWith('WEBVTT') ? 'vtt' : format === 'srt' ? 'srt' : 'vtt';

  const blocks = resolvedFormat === 'srt' ? splitSrtBlocks(trimmed) : splitVttBlocks(trimmed);
  const cues = parseCueBlocks(blocks);
  return buildSegments(cues);
}

export function parseSubtitleFile(
  content: string,
  fileName: string | null | undefined,
): ParseSubtitleResult | null {
  const lower = fileName?.trim().toLowerCase() ?? '';
  const format: 'vtt' | 'srt' = lower.endsWith('.srt')
    ? 'srt'
    : lower.endsWith('.vtt')
      ? 'vtt'
      : content.trimStart().startsWith('WEBVTT')
        ? 'vtt'
        : 'vtt';
  return parseSubtitleContent(content, format);
}
