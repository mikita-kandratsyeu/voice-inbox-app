import { normalizeInlineSpeakerLabelsToParagraphBreaks } from '@/lib/normalizeSpeakerTurnsMarkdown';
import { normalizeSpeakerTurnsForEmail } from '@/lib/normalizeSpeakerTurnsForEmail';
import { normalizeTranscriptTimestampLinesForEmail } from '@/lib/normalizeTranscriptTimestampsForEmail';
import { stripShareNoteSectionMarkers } from '@/lib/shareNoteSectionMarkers';
import { formatWikiLinksForSharePdf } from '@/lib/stripWikiLinksForShareDelivery';

/** Normalizes mobile share markdown for PDF export (tables, wiki link styling). */
export function prepareShareNotePdfMarkdown(markdown: string): string {
  let out = normalizeTranscriptTimestampLinesForEmail(markdown);
  out = normalizeSpeakerTurnsForEmail(out);
  out = stripShareNoteSectionMarkers(out);
  out = normalizeInlineSpeakerLabelsToParagraphBreaks(out);
  out = formatWikiLinksForSharePdf(out);
  return out;
}
