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

export function splitSpeakerTurnEntries(text: string): SpeakerTurnEntry[] {
  const normalized = normalizeInlineSpeakerLabels(text);
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
  const normalized = normalizeInlineSpeakerLabels(body);
  const lines = normalized.split(/\r?\n/);
  const firstSpeakerIdx = lines.findIndex((line) => SPEAKER_LINE.test(line.trim()));

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
