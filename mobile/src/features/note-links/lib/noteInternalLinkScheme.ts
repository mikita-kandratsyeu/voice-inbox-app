export const NOTE_LINK_SCHEME_PREFIX = 'voice-inbox://note/';

export function buildNoteInternalLinkUrl(recordId: string): string {
  return `${NOTE_LINK_SCHEME_PREFIX}${recordId}`;
}

export function parseNoteInternalLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith(NOTE_LINK_SCHEME_PREFIX)) return null;

  const recordId = trimmed.slice(NOTE_LINK_SCHEME_PREFIX.length).trim();
  return recordId.length > 0 ? recordId : null;
}
