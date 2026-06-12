/** Stable section anchors for in-app note document round-trip (hidden in reading view). */
export const NOTE_DOCUMENT_SECTION_MARKER_RE = /<!--\s*vi:section:([a-z0-9-]+)\s*-->/g;

const NOTE_DOCUMENT_MARKER_LINE_RE = /^\s*<!--\s*vi:section:[a-z0-9-]+\s*-->\s*\r?\n?/gim;
const NOTE_DOCUMENT_MARKER_INLINE_RE = /<!--\s*vi:section:[a-z0-9-]+\s*-->/gi;

export function stripNoteDocumentMarkers(markdown: string): string {
  return markdown
    .replace(NOTE_DOCUMENT_MARKER_LINE_RE, '')
    .replace(NOTE_DOCUMENT_MARKER_INLINE_RE, '');
}

export function listNoteDocumentSectionIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  const re = new RegExp(NOTE_DOCUMENT_SECTION_MARKER_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}
