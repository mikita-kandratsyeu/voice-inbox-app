import {
  listNoteDocumentSectionIds,
  NOTE_DOCUMENT_SECTION_MARKER_RE,
  stripNoteDocumentMarkers,
} from './noteDocumentSectionMarkers';
import {
  isNoteDocumentSectionExpandedByDefault,
  prepareNoteDocumentSectionBody,
  resolveNoteDocumentSectionTitle,
} from './noteDocumentSectionUi';

export type NoteDocumentReadingPreambleSegment = {
  kind: 'preamble';
  markdown: string;
};

export type NoteDocumentReadingSectionSegment = {
  kind: 'section';
  id: string;
  title: string;
  bodyMarkdown: string;
  defaultExpanded: boolean;
};

export type NoteDocumentReadingSegment =
  | NoteDocumentReadingPreambleSegment
  | NoteDocumentReadingSectionSegment;

export type SplitNoteDocumentForReadingResult = {
  hasSections: boolean;
  segments: NoteDocumentReadingSegment[];
};

export function splitNoteDocumentForReading(markdown: string): SplitNoteDocumentForReadingResult {
  if (!listNoteDocumentSectionIds(markdown).size) {
    return { hasSections: false, segments: [] };
  }

  const segments: NoteDocumentReadingSegment[] = [];
  const parts = markdown.split(NOTE_DOCUMENT_SECTION_MARKER_RE);
  const preamble = stripNoteDocumentMarkers(parts[0] ?? '').trimEnd();

  if (preamble.length > 0) {
    segments.push({ kind: 'preamble', markdown: preamble });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const sectionId = parts[i];
    const rawBody = parts[i + 1] ?? '';
    if (!sectionId) continue;

    const bodyMarkdown = prepareNoteDocumentSectionBody(rawBody);
    if (!bodyMarkdown.trim()) continue;

    segments.push({
      kind: 'section',
      id: sectionId,
      title: resolveNoteDocumentSectionTitle(sectionId, rawBody),
      bodyMarkdown,
      defaultExpanded: isNoteDocumentSectionExpandedByDefault(sectionId),
    });
  }

  return { hasSections: segments.some((segment) => segment.kind === 'section'), segments };
}
