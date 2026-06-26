import type { Colors } from '@/shared/config';
import { isDarkSurfaceColor } from '@/shared/lib';

/** Four hues chosen to stay distinguishable regardless of user accent color. */
const SPEAKER_STRIPE_COLORS_LIGHT = ['#2563eb', '#059669', '#d97706', '#db2777'] as const;
const SPEAKER_STRIPE_COLORS_DARK = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'] as const;

/** One estimated speaker turn from pseudo-diarization markdown. */
export type MeetingUtterance = {
  speakerLabel: string;
  body: string;
  /** Stable color slot 0–3 from first-seen speaker label. */
  colorSlot: number;
};

const KNOWN_SPEAKER_LABEL_HEAD =
  '(?:Speaker|Участник|Участница|Спикер|Собеседник|Собеседница|Participant|Person|User|Interviewer|Interviewee|Host|Guest|Customer|Client|Moderator|Модератор|Интервьюер|Ведущий|Клиент|Гость|Пользователь)(?:\\s*(?:#|№)?\\s*\\d+)?';

/** Transcript names/roles (e.g. "Алекс:", "Рассказчик:") when AI skips neutral labels. */
const GENERIC_SPEAKER_LABEL = "[\\p{L}][\\p{L}\\p{N}\\s'\\-]{0,58}";

export const SPEAKER_LABEL_HEAD = `(?:${KNOWN_SPEAKER_LABEL_HEAD}|${GENERIC_SPEAKER_LABEL})`;

const SPEAKER_LINE_FLAGS = 'iu';

export const SPEAKER_LINE_RE = new RegExp(
  `^\\s*(?:\\*\\*)?[\\[(]?(${SPEAKER_LABEL_HEAD})[\\])]?\\s*(?::\\s*(?:\\*\\*)?|\\*\\*\\s*:)\\s*(.*)$`,
  SPEAKER_LINE_FLAGS,
);

const BLOCKED_SPEAKER_LABELS = new Set(['http', 'https', 'ftp', 'mailto']);
const MARKDOWN_LINE_PREFIX_RE = /^\s*(?:>\s*)?(?:[-*+]\s+|\d+[.)]\s+)?/u;
const TABLE_SEPARATOR_CELL_RE = /^:?-{3,}:?$/;
const KNOWN_SPEAKER_DASH_LINE_RE = new RegExp(
  `^\\s*(?:\\*\\*)?[\\[(]?(${KNOWN_SPEAKER_LABEL_HEAD})[\\])]?\\s*(?:\\*\\*)?\\s+[-–—]\\s+(.*)$`,
  SPEAKER_LINE_FLAGS,
);

export function isRecognizedSpeakerLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  return !BLOCKED_SPEAKER_LABELS.has(trimmed.toLowerCase());
}

/** Same as web `normalizeInlineSpeakerLabelsToParagraphBreaks` — keeps share/email readable. */
const INLINE_SPEAKER_PARAGRAPH_BREAK = new RegExp(
  `([^\\n\\r\\s*])\\s*(${KNOWN_SPEAKER_LABEL_HEAD}\\s*:)`,
  'giu',
);

const BOLD_SPEAKER_HEADING = new RegExp(
  `^\\s*\\*\\*(${SPEAKER_LABEL_HEAD})\\*\\*\\s*$`,
  SPEAKER_LINE_FLAGS,
);

function isBoldSpeakerHeadingLine(line: string): boolean {
  return BOLD_SPEAKER_HEADING.test(line.trim());
}

function stripMarkdownLinePrefix(line: string): string {
  return line.replace(MARKDOWN_LINE_PREFIX_RE, '').trim();
}

function parseMarkdownTableSpeakerLine(
  line: string,
): { kind: 'speaker'; speakerLabel: string; body: string } | { kind: 'skip' } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return null;
  }

  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);
  if (cells.length < 2) {
    return null;
  }
  if (cells.some((cell) => TABLE_SEPARATOR_CELL_RE.test(cell))) {
    return { kind: 'skip' };
  }

  const speakerMatch = cells[0]!.match(SPEAKER_LINE_RE);
  const speakerLabel = speakerMatch ? speakerMatch[1]!.trim() : cells[0]!;
  const normalizedHeader = `${speakerLabel.toLowerCase()}:${cells[1]!.toLowerCase()}`;
  if (
    /^(speaker|participant|участник|спикер):(text|dialogue|utterance|reply|реплика|текст)$/iu.test(
      normalizedHeader,
    )
  ) {
    return { kind: 'skip' };
  }
  if (!isRecognizedSpeakerLabel(speakerLabel) || !SPEAKER_LINE_RE.test(`${speakerLabel}:`)) {
    return null;
  }

  return { kind: 'speaker', speakerLabel, body: cells.slice(1).join(' | ').trim() };
}

function parseSpeakerLine(
  line: string,
): { kind: 'speaker'; speakerLabel: string; body: string } | { kind: 'skip' } | null {
  const normalizedLine = stripMarkdownLinePrefix(line);

  const table = parseMarkdownTableSpeakerLine(normalizedLine);
  if (table) {
    return table;
  }

  const colonMatch = normalizedLine.match(SPEAKER_LINE_RE);
  if (colonMatch && isRecognizedSpeakerLabel(colonMatch[1]!)) {
    return {
      kind: 'speaker',
      speakerLabel: colonMatch[1]!.trim(),
      body: (colonMatch[2] ?? '').trim(),
    };
  }

  const dashMatch = normalizedLine.match(KNOWN_SPEAKER_DASH_LINE_RE);
  if (dashMatch && isRecognizedSpeakerLabel(dashMatch[1]!)) {
    return {
      kind: 'speaker',
      speakerLabel: dashMatch[1]!.trim(),
      body: (dashMatch[2] ?? '').trim(),
    };
  }

  return null;
}

/** Converts `**Участник 1**` / `**Собеседник 2**` blocks into `Label: body` lines (web parity). */
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

export function normalizeMeetingDialogueMarkdownParagraphs(raw: string): string {
  const expanded = expandBoldSpeakerBlocksToColonLines(raw);
  const t = expanded.trim();
  if (!t || !t.includes(':')) {
    return expanded;
  }
  return t.replace(INLINE_SPEAKER_PARAGRAPH_BREAK, '$1\n\n$2');
}

/**
 * Split pseudo-diarization text into turns. Lines without a speaker prefix attach
 * to the previous turn (multi-line replies).
 */
export function parseMeetingDialogue(raw: string): MeetingUtterance[] {
  const text = normalizeMeetingDialogueMarkdownParagraphs(raw).trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const labelToSlot = new Map<string, number>();
  let nextSlot = 0;
  const slotFor = (label: string) => {
    const key = label.trim().toLowerCase();
    if (!labelToSlot.has(key)) {
      labelToSlot.set(key, nextSlot % 4);
      nextSlot += 1;
    }
    return labelToSlot.get(key)!;
  };

  const out: MeetingUtterance[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const speakerLine = parseSpeakerLine(trimmed);
    if (speakerLine?.kind === 'skip') {
      continue;
    }
    if (speakerLine) {
      const { speakerLabel, body } = speakerLine;
      out.push({
        speakerLabel,
        body,
        colorSlot: slotFor(speakerLabel),
      });
    } else if (out.length > 0) {
      const last = out[out.length - 1];
      last.body = last.body ? `${last.body}\n${trimmed}` : trimmed;
    } else {
      out.push({ speakerLabel: '', body: trimmed, colorSlot: 0 });
    }
  }

  return out.filter((u) => u.body.length > 0 || u.speakerLabel.length > 0);
}

export function utteranceStripeColor(color: Colors, slot: number): string {
  const palette = isDarkSurfaceColor(color)
    ? SPEAKER_STRIPE_COLORS_DARK
    : SPEAKER_STRIPE_COLORS_LIGHT;
  return palette[slot % palette.length];
}
