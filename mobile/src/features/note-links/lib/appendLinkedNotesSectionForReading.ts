import type { WikiLinkResolvableRecord } from './resolveWikiLinkTarget';

export const NOTE_DOCUMENT_LINKED_SECTION_MARKER = '<!-- vi:section:linked -->';

const LINKED_SECTION_MARKER_RE = /<!--\s*vi:section:linked\s*-->/i;

export function buildLinkedNotesReadingMarkdown(
  linkedRecordIds: readonly string[],
  records: readonly WikiLinkResolvableRecord[],
  sectionTitle: string,
): string | null {
  if (!linkedRecordIds.length || !sectionTitle.trim()) {
    return null;
  }

  const byId = new Map(records.map((record) => [record.id, record]));
  const lines: string[] = [];

  for (const id of linkedRecordIds) {
    const record = byId.get(id);
    if (!record || record.status === 'archived') continue;

    const title = record.title?.trim() || id;
    lines.push(`- [[${id}|${title}]]`);
  }

  if (!lines.length) {
    return null;
  }

  return `${lines.join('\n')}\n`;
}

export function appendLinkedNotesSectionForReading(
  markdown: string,
  linkedRecordIds: readonly string[],
  records: readonly WikiLinkResolvableRecord[],
  sectionTitle: string,
): string {
  const linkedMarkdown = buildLinkedNotesReadingMarkdown(linkedRecordIds, records, sectionTitle);
  if (!linkedMarkdown) {
    return markdown;
  }

  const trimmed = markdown.trimEnd();
  const prefix = trimmed.length > 0 ? `${trimmed}\n\n` : '';

  return `${prefix}## ${sectionTitle.trim()}\n\n${linkedMarkdown}`;
}

/** Appends a `vi:section:linked` block for the source editor (stripped on save). */
export function appendLinkedNotesSectionForSourceEditor(
  markdown: string,
  linkedRecordIds: readonly string[],
  records: readonly WikiLinkResolvableRecord[],
  sectionTitle: string,
): string {
  const base = stripLinkedNotesSectionFromSourceEditor(markdown);
  const linkedMarkdown = buildLinkedNotesReadingMarkdown(linkedRecordIds, records, sectionTitle);
  if (!linkedMarkdown) {
    return base;
  }

  const trimmed = base.trimEnd();
  const prefix = trimmed.length > 0 ? `${trimmed}\n\n` : '';

  return `${prefix}${NOTE_DOCUMENT_LINKED_SECTION_MARKER}\n\n## ${sectionTitle.trim()}\n\n${linkedMarkdown}`;
}

export function stripLinkedNotesSectionFromSourceEditor(markdown: string): string {
  const match = LINKED_SECTION_MARKER_RE.exec(markdown);
  if (!match || match.index === undefined) {
    return markdown;
  }

  return markdown.slice(0, match.index).trimEnd();
}
