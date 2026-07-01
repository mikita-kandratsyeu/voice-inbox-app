/**
 * Mobile share export may join transcript segments with single `\n`, or even inline
 * `[MM:SS]` tokens on one line. CommonMark collapses that into one HTML paragraph.
 * For email HTML only: split entries and render as a GFM table (reliable in mail clients).
 */
import { replaceMarkdownSection, twoColumnMarkdownTable } from './sharePdfMarkdownTables';
import { stripInlineShareSectionMarkers } from './shareSectionMarkers';

const TIMESTAMP_TOKEN = /\[\d{1,2}:\d{2}(?::\d{2})?\]/;
const TIMESTAMP_LINE = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/;
const SECTION_MARKER_LINE = /^\s*<!--\s*vi:section:[a-z0-9-]+\s*-->\s*$/i;

/** Mobile share/PDF export uses `**[00:42]**` blocks instead of `[00:42] …` lines. */
const BOLD_TIMESTAMP_HEADING = /^\s*\*\*(\[\d{1,2}:\d{2}(?::\d{2})?\])\*\*\s*$/;

const TRANSCRIPT_HEADING = /^## (?:Транскрипт|Transcript)\r?\n/im;

export type TranscriptTimestampEntry = {
  time: string;
  text: string;
};

function isBoldTimestampHeadingLine(line: string): boolean {
  return BOLD_TIMESTAMP_HEADING.test(line.trim());
}

/** Converts legacy mobile bold timestamp blocks into inline `[MM:SS] text` lines. */
export function expandBoldTimestampBlocksToInlineLines(text: string): string {
  if (!text.includes('**')) {
    return text;
  }

  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i]!.trim();
    const boldMatch = trimmed.match(BOLD_TIMESTAMP_HEADING);
    if (!boldMatch) {
      out.push(lines[i]!);
      i += 1;
      continue;
    }

    const timeToken = boldMatch[1]!;
    const time = timeToken.replace(/^\[|\]$/g, '');
    i += 1;
    while (i < lines.length && !lines[i]!.trim()) {
      i += 1;
    }

    const bodyLines: string[] = [];
    while (i < lines.length) {
      const nextTrimmed = lines[i]!.trim();
      if (!nextTrimmed) {
        let j = i + 1;
        while (j < lines.length && !lines[j]!.trim()) {
          j += 1;
        }
        if (j < lines.length && isBoldTimestampHeadingLine(lines[j]!)) {
          break;
        }
        i += 1;
        continue;
      }
      if (isBoldTimestampHeadingLine(nextTrimmed)) {
        break;
      }
      bodyLines.push(nextTrimmed);
      i += 1;
    }

    const body = bodyLines.join(' ').trim();
    out.push(body ? `[${time}] ${body}` : `[${time}]`);
    if (i < lines.length) {
      out.push('');
    }
  }

  return out.join('\n');
}

/** Split inline `[MM:SS]` tokens and single-newline segment lines into discrete entries. */
export function splitTranscriptTimestampEntries(text: string): TranscriptTimestampEntry[] {
  const expanded = expandBoldTimestampBlocksToInlineLines(text);
  const normalized = expanded
    .split(/\r?\n/)
    .map((line) => line.replace(/(?<=\S)\s+(?=\[\d{1,2}:\d{2}(?::\d{2})?\](?:\s|$))/g, '\n'))
    .join('\n');

  const entries: TranscriptTimestampEntry[] = [];

  for (const rawLine of normalized.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || SECTION_MARKER_LINE.test(line)) continue;

    const match = line.match(TIMESTAMP_LINE);
    if (match) {
      entries.push({
        time: match[1],
        text: stripInlineShareSectionMarkers(match[2] ?? ''),
      });
      continue;
    }

    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      const continuation = stripInlineShareSectionMarkers(line);
      if (!continuation) continue;
      last.text = last.text ? `${last.text} ${continuation}` : continuation;
    }
  }

  return entries
    .map((entry) => ({
      time: entry.time,
      text: stripInlineShareSectionMarkers(entry.text),
    }))
    .filter((entry) => entry.text.length > 0 || entry.time.length > 0);
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

export function normalizeTranscriptTimestampLinesForPdf(markdown: string): string {
  if (!TIMESTAMP_TOKEN.test(markdown)) {
    return markdown;
  }

  if (!TRANSCRIPT_HEADING.test(markdown)) {
    return markdown.replace(/\r?\n(?=\[\d{1,2}:\d{2}(?::\d{2})?\](?:\s|$))/g, '\n\n');
  }

  return replaceMarkdownSection(markdown, TRANSCRIPT_HEADING, replaceTranscriptSection);
}
