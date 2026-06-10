import { normalizeInlineSpeakerLabelsToParagraphBreaks } from '@/lib/normalizeSpeakerTurnsMarkdown';
import { normalizeSpeakerTurnsForEmail } from '@/lib/normalizeSpeakerTurnsForEmail';
import { normalizeTranscriptTimestampLinesForEmail } from '@/lib/normalizeTranscriptTimestampsForEmail';
import { stripShareNoteSectionMarkers } from '@/lib/shareNoteSectionMarkers';

/** Normalizes mobile share markdown for transactional email HTML and plain delivery. */
export function prepareShareNoteEmailMarkdown(markdown: string): string {
  let out = normalizeTranscriptTimestampLinesForEmail(markdown);
  out = normalizeSpeakerTurnsForEmail(out);
  out = stripShareNoteSectionMarkers(out);
  out = normalizeInlineSpeakerLabelsToParagraphBreaks(out);
  return out;
}
