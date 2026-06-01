import type { Colors } from '@/shared/config';

/** One estimated speaker turn from pseudo-diarization markdown. */
export type MeetingUtterance = {
  speakerLabel: string;
  body: string;
  /** Stable color slot 0–3 from first-seen speaker label. */
  colorSlot: number;
};

const SPEAKER_LABEL_HEAD =
  '(?:Speaker|Участник|Спикер|Participant|Interviewer|Interviewee|Host|Guest|Модератор|Интервьюер|Ведущий)(?:\\s+\\d+|\\s*\\d+)?';

export const SPEAKER_LINE_RE = new RegExp(`^\\s*(${SPEAKER_LABEL_HEAD})\\s*:\\s*(.*)$`, 'i');

/** Same as web `normalizeInlineSpeakerLabelsToParagraphBreaks` — keeps share/email readable. */
const INLINE_SPEAKER_PARAGRAPH_BREAK = new RegExp(
  `([^\\n\\r\\s])\\s*(${SPEAKER_LABEL_HEAD}\\s*:)`,
  'gi',
);

export function normalizeMeetingDialogueMarkdownParagraphs(raw: string): string {
  const t = raw.trim();
  if (!t || !t.includes(':')) {
    return raw;
  }
  return t.replace(INLINE_SPEAKER_PARAGRAPH_BREAK, '$1\n\n$2');
}

/**
 * Split pseudo-diarization text into turns. Lines without a speaker prefix attach
 * to the previous turn (multi-line replies).
 */
export function parseMeetingDialogue(raw: string): MeetingUtterance[] {
  const text = raw.trim();
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

    const m = trimmed.match(SPEAKER_LINE_RE);
    if (m) {
      const speakerLabel = m[1].trim();
      const body = (m[2] ?? '').trim();
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
  const accents = [
    color.accent.primary,
    color.accent.transcript,
    color.accent.aiData,
    color.accent.models,
  ] as const;
  return accents[slot % accents.length];
}
