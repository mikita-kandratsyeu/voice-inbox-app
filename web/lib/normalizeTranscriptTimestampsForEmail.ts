/**
 * Mobile share export may join transcript segments with single `\n`, or even inline
 * `[MM:SS]` tokens on one line. CommonMark collapses that into one HTML paragraph.
 * For email HTML only: split entries and render as a GFM table (reliable in mail clients).
 */
import { replaceMarkdownSection, twoColumnMarkdownTable } from '@/lib/shareNoteEmailMarkdownTables';

const TIMESTAMP_TOKEN = /\[\d{1,2}:\d{2}\]/;
const TIMESTAMP_LINE = /^\[(\d{1,2}:\d{2})\]\s*(.*)$/;

const TRANSCRIPT_HEADING = /^## (?:Транскрипт|Transcript)\r?\n/im;

export type TranscriptTimestampEntry = {
  time: string;
  text: string;
};

/** Split inline `[MM:SS]` tokens and single-newline segment lines into discrete entries. */
export function splitTranscriptTimestampEntries(text: string): TranscriptTimestampEntry[] {
  const normalized = text
    .split(/\r?\n/)
    .map((line) => line.replace(/(?<=\S)\s+(?=\[\d{1,2}:\d{2}\](?:\s|$))/g, '\n'))
    .join('\n');

  const entries: TranscriptTimestampEntry[] = [];

  for (const rawLine of normalized.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(TIMESTAMP_LINE);
    if (match) {
      entries.push({ time: match[1], text: match[2].trim() });
      continue;
    }

    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      last.text = last.text ? `${last.text} ${line}` : line;
    }
  }

  return entries.filter((entry) => entry.text.length > 0 || entry.time.length > 0);
}

function replaceTranscriptSection(body: string): string {
  if (!TIMESTAMP_TOKEN.test(body)) {
    return body;
  }

  const entries = splitTranscriptTimestampEntries(body);
  if (entries.length === 0) {
    return body;
  }

  return twoColumnMarkdownTable(
    entries.map((entry) => ({
      first: entry.time,
      second: entry.text,
    })),
  );
}

export function normalizeTranscriptTimestampLinesForEmail(markdown: string): string {
  if (!TIMESTAMP_TOKEN.test(markdown)) {
    return markdown;
  }

  if (!TRANSCRIPT_HEADING.test(markdown)) {
    return markdown.replace(/\r?\n(?=\[\d{1,2}:\d{2}\](?:\s|$))/g, '\n\n');
  }

  return replaceMarkdownSection(markdown, TRANSCRIPT_HEADING, replaceTranscriptSection);
}
