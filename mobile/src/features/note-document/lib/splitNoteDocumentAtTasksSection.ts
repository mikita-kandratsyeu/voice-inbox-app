import {
  NOTE_DOCUMENT_SECTION_MARKER_RE,
  stripNoteDocumentMarkers,
} from './noteDocumentSectionMarkers';

const TASKS_SECTION_MARKER = /<!--\s*vi:section:tasks\s*-->/i;

export type NoteDocumentReadingSplit = {
  beforeMarkdown: string;
  afterMarkdown: string;
};

/** Splits full document markdown around the tasks section for interactive task rendering. */
export function splitNoteDocumentAtTasksSection(
  markdown: string,
): NoteDocumentReadingSplit | null {
  const match = markdown.match(TASKS_SECTION_MARKER);
  if (!match || match.index === undefined) return null;

  const before = markdown.slice(0, match.index);
  const afterTasksMarker = markdown.slice(match.index + match[0].length);

  const nextMarker = new RegExp(NOTE_DOCUMENT_SECTION_MARKER_RE.source, 'i');
  const nextMatch = nextMarker.exec(afterTasksMarker);
  const after =
    nextMatch?.index !== undefined ? afterTasksMarker.slice(nextMatch.index) : '';

  return {
    beforeMarkdown: stripNoteDocumentMarkers(before).trimEnd(),
    afterMarkdown: stripNoteDocumentMarkers(after).trimStart(),
  };
}
