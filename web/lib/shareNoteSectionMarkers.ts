/** Stable section markers emitted by mobile share/email export (`shareSectionMarkers.ts`). */
export const SHARE_SPEAKER_TURNS_SECTION_MARKER = '<!-- vi:section:speaker-turns -->';

export const SHARE_SPEAKER_TURNS_SECTION_MARKER_RE =
  /<!--\s*vi:section:speaker-turns\s*-->\s*(?:\r?\n)?/i;

const SHARE_SECTION_MARKER_LINE_RE = /^\s*<!--\s*vi:section:[a-z0-9-]+\s*-->\s*\r?\n?/gim;
export const SHARE_NOTE_SECTION_MARKER_INLINE_RE = /<!--\s*vi:section:[a-z0-9-]+\s*-->/gi;

/** Removes inline `vi:section` markers from a single line or table cell. */
export function stripInlineShareNoteSectionMarkers(text: string): string {
  return text.replace(SHARE_NOTE_SECTION_MARKER_INLINE_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Removes machine-readable section markers from user-visible share/email markdown. */
export function stripShareNoteSectionMarkers(markdown: string): string {
  return markdown
    .replace(SHARE_SECTION_MARKER_LINE_RE, '')
    .replace(SHARE_NOTE_SECTION_MARKER_INLINE_RE, '');
}
