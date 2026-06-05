/**
 * When pseudo-diarization is stored as one line ("Speaker 1: … Speaker 2: …"),
 * CommonMark treats it as a single paragraph and email HTML shows a wall of text.
 * Inserts paragraph breaks before speaker labels that start a new inline turn.
 *
 * Inline breaks use known neutral labels only; transcript names are parsed at line start in mobile.
 */
const KNOWN_SPEAKER_LABEL_HEAD =
  '(?:Speaker|Участник|Спикер|Собеседник|Собеседница|Participant|Interviewer|Interviewee|Host|Guest|Модератор|Интервьюер|Ведущий|Клиент|Гость)(?:\\s+\\d+|\\s*\\d+)?';

const SPEAKER_LABEL_INLINE = `${KNOWN_SPEAKER_LABEL_HEAD}\\s*:`;

const INLINE_SPEAKER_PARAGRAPH_BREAK = new RegExp(
  `([^\\n\\r\\s])\\s*(${SPEAKER_LABEL_INLINE})`,
  'giu',
);

export function normalizeInlineSpeakerLabelsToParagraphBreaks(markdown: string): string {
  if (!markdown.includes(':')) {
    return markdown;
  }
  return markdown.replace(INLINE_SPEAKER_PARAGRAPH_BREAK, '$1\n\n$2');
}
