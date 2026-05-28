/**
 * Meeting dialogue in share email: speaker turns may be inline ("Speaker 1: … Speaker 2: …").
 * For email HTML only, render the speaker section as a two-column table (same as transcript).
 *
 * Label prefixes mirror `mobile/src/screens/recording-detail/lib/parseMeetingDialogue.ts`.
 */
import { replaceMarkdownSection, twoColumnMarkdownTable } from '@/lib/shareNoteEmailMarkdownTables';

const SPEAKER_LABEL_HEAD =
  '(?:Speaker|Участник|Спикер|Participant|Interviewer|Interviewee|Host|Guest|Модератор|Интервьюер|Ведущий)(?:\\s+\\d+|\\s*\\d+)?';

const SPEAKER_LABEL_INLINE = new RegExp(`([^\\n\\r\\s])\\s*(${SPEAKER_LABEL_HEAD}\\s*:)`, 'gi');

const SPEAKER_LINE = new RegExp(`^\\s*(${SPEAKER_LABEL_HEAD})\\s*:\\s*(.*)$`, 'i');

/** Mobile share/PDF export uses `**Участник 1**` blocks instead of `Участник 1: …` lines. */
const BOLD_SPEAKER_HEADING = new RegExp(`^\\s*\\*\\*(${SPEAKER_LABEL_HEAD})\\*\\*\\s*$`, 'i');

const SPEAKER_SECTION_HEADING = /^## (?:Реплики по спикерам|Speaker turns)\r?\n/im;

export type SpeakerTurnEntry = {
  speaker: string;
  text: string;
};

function normalizeInlineSpeakerLabels(text: string): string {
  if (!text.includes(':')) {
    return text;
  }
  return text.replace(SPEAKER_LABEL_INLINE, '$1\n\n$2');
}

function isBoldSpeakerHeadingLine(line: string): boolean {
  return BOLD_SPEAKER_HEADING.test(line.trim());
}

/** Converts legacy mobile bold speaker blocks into colon lines for table parsing. */
export function expandBoldSpeakerBlocksToColonLines(text: string): string {
  if (!text.includes('**')) {
    return text;
  }

  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i]!.trim();
    const boldMatch = trimmed.match(BOLD_SPEAKER_HEADING);
    if (!boldMatch) {
      out.push(lines[i]!);
      i += 1;
      continue;
    }

    const speaker = boldMatch[1]!.trim();
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
        if (j < lines.length && isBoldSpeakerHeadingLine(lines[j]!)) {
          break;
        }
        i += 1;
        continue;
      }
      if (isBoldSpeakerHeadingLine(nextTrimmed)) {
        break;
      }
      bodyLines.push(nextTrimmed);
      i += 1;
    }

    const body = bodyLines.join(' ').trim();
    out.push(body ? `${speaker}: ${body}` : `${speaker}:`);
    if (i < lines.length) {
      out.push('');
    }
  }

  return out.join('\n');
}

export function splitSpeakerTurnEntries(text: string): SpeakerTurnEntry[] {
  const normalized = normalizeInlineSpeakerLabels(expandBoldSpeakerBlocksToColonLines(text));
  const entries: SpeakerTurnEntry[] = [];

  for (const rawLine of normalized.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(SPEAKER_LINE);
    if (match) {
      entries.push({ speaker: match[1].trim(), text: (match[2] ?? '').trim() });
      continue;
    }

    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      last.text = last.text ? `${last.text} ${line}` : line;
    }
  }

  return entries.filter((entry) => entry.speaker.length > 0 || entry.text.length > 0);
}

function partitionSpeakerSectionBody(body: string): { prefix: string; speakerText: string } {
  const normalized = normalizeInlineSpeakerLabels(expandBoldSpeakerBlocksToColonLines(body));
  const lines = normalized.split(/\r?\n/);
  const firstSpeakerIdx = lines.findIndex((line) => {
    const trimmed = line.trim();
    return SPEAKER_LINE.test(trimmed) || isBoldSpeakerHeadingLine(trimmed);
  });

  if (firstSpeakerIdx === -1) {
    return { prefix: body, speakerText: '' };
  }

  const prefix = lines.slice(0, firstSpeakerIdx).join('\n').trimEnd();
  const speakerText = lines.slice(firstSpeakerIdx).join('\n');

  return {
    prefix: prefix ? `${prefix}\n\n` : '',
    speakerText,
  };
}

function replaceSpeakerSection(body: string): string {
  const { prefix, speakerText } = partitionSpeakerSectionBody(body);
  if (!speakerText) {
    return body;
  }

  const entries = splitSpeakerTurnEntries(speakerText);
  if (entries.length === 0) {
    return body;
  }

  const table = twoColumnMarkdownTable(
    entries.map((entry) => ({
      first: entry.speaker,
      second: entry.text,
    })),
  );

  return `${prefix}${table}`;
}

export function normalizeSpeakerTurnsForEmail(markdown: string): string {
  if (!SPEAKER_SECTION_HEADING.test(markdown)) {
    return markdown;
  }

  return replaceMarkdownSection(markdown, SPEAKER_SECTION_HEADING, replaceSpeakerSection);
}
