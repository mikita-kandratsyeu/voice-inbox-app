import { normalizeSpeakerTurnsForPdf } from './normalizeSpeakerTurnsForPdf';
import { normalizeInlineSpeakerLabelsToParagraphBreaks } from './normalizeSpeakerTurnsMarkdown';
import { normalizeTranscriptTimestampLinesForPdf } from './normalizeTranscriptTimestampsForPdf';
import { stripShareSectionMarkers } from './shareSectionMarkers';
import { formatWikiLinksForSharePdf } from './stripWikiLinksForShareDelivery';

/** Normalizes mobile share markdown for on-device PDF generation. */
export function prepareShareMarkdownForPdf(markdown: string): string {
  let out = normalizeTranscriptTimestampLinesForPdf(markdown);
  out = normalizeSpeakerTurnsForPdf(out);
  out = stripShareSectionMarkers(out);
  out = normalizeInlineSpeakerLabelsToParagraphBreaks(out);
  out = formatWikiLinksForSharePdf(out);
  return out;
}
