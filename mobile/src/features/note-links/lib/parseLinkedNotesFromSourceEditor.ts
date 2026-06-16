import { NOTE_DOCUMENT_LINKED_SECTION_MARKER } from './appendLinkedNotesSectionForReading';
import {
  buildWikiLinkIndex,
  resolveWikiLinkTarget,
  type WikiLinkResolvableRecord,
} from './resolveWikiLinkTarget';

const LINKED_SECTION_MARKER_RE = /<!--\s*vi:section:linked\s*-->/i;

const WIKI_BULLET_LINE_RE = /^[-*]\s+\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*$/;

export type ParseLinkedNotesFromSourceEditorResult =
  | { ok: true; linkedRecordIds: string[] }
  | { ok: false };

function normalizeLinkedSectionBody(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n');

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  if (lines[0]?.match(/^#{1,3}\s/)) {
    lines.shift();
  }

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return lines.join('\n');
}

function splitLinkedSectionBody(markdown: string): string | null {
  if (!LINKED_SECTION_MARKER_RE.test(markdown)) {
    return null;
  }

  const markerIndex = markdown.search(LINKED_SECTION_MARKER_RE);
  if (markerIndex === -1) {
    return null;
  }

  const afterMarker = markdown.slice(markerIndex + NOTE_DOCUMENT_LINKED_SECTION_MARKER.length);
  const nextMarker = /<!--\s*vi:section:[a-z0-9-]+\s*-->/i.exec(afterMarker);
  const rawBody = nextMarker ? afterMarker.slice(0, nextMarker.index) : afterMarker;

  return normalizeLinkedSectionBody(rawBody);
}

export function parseLinkedNotesFromSourceEditor(
  markdown: string,
  sourceRecordId: string,
  records: readonly WikiLinkResolvableRecord[],
): ParseLinkedNotesFromSourceEditorResult {
  const body = splitLinkedSectionBody(markdown);
  if (body === null) {
    return { ok: true, linkedRecordIds: [] };
  }

  if (!body.trim()) {
    return { ok: true, linkedRecordIds: [] };
  }

  const index = buildWikiLinkIndex(records);
  const linkedRecordIds: string[] = [];
  const seen = new Set<string>();

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!WIKI_BULLET_LINE_RE.test(trimmed)) {
      return { ok: false };
    }

    const ref = trimmed.match(WIKI_BULLET_LINE_RE)?.[1]?.trim() ?? '';
    const targetId = resolveWikiLinkTarget(ref, index);
    if (!targetId || targetId === sourceRecordId) {
      return { ok: false };
    }

    if (seen.has(targetId)) continue;
    seen.add(targetId);
    linkedRecordIds.push(targetId);
  }

  return { ok: true, linkedRecordIds };
}
