/**
 * When pseudo-diarization is stored as one line ("Speaker 1: … Speaker 2: …"),
 * CommonMark treats it as a single paragraph and email HTML shows a wall of text.
 * Inserts paragraph breaks before speaker labels that start a new inline turn.
 *
 * Label prefixes mirror `mobile/src/screens/recording-detail/lib/parseMeetingDialogue.ts`.
 */
const SPEAKER_LABEL_INLINE =
  '(?:Speaker|Участник|Спикер|Participant|Interviewer|Interviewee|Host|Guest|Модератор|Интервьюер|Ведущий)(?:\\s+\\d+|\\s*\\d+)?\\s*:';

const INLINE_SPEAKER_PARAGRAPH_BREAK = new RegExp(
  `([^\\n\\r\\s])\\s*(${SPEAKER_LABEL_INLINE})`,
  'gi',
);

export function normalizeInlineSpeakerLabelsToParagraphBreaks(markdown: string): string {
  if (!markdown.includes(':')) {
    return markdown;
  }
  return markdown.replace(INLINE_SPEAKER_PARAGRAPH_BREAK, '$1\n\n$2');
}
