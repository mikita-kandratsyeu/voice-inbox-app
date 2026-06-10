/** Stable section markers emitted by mobile share/email export (`shareSectionMarkers.ts`). */
export const SHARE_SPEAKER_TURNS_SECTION_MARKER = '<!-- vi:section:speaker-turns -->';

export const SHARE_SPEAKER_TURNS_SECTION_MARKER_RE =
  /<!--\s*vi:section:speaker-turns\s*-->\s*(?:\r?\n)?/i;

const SHARE_SPEAKER_TURNS_SECTION_MARKER_LINE_RE =
  /^\s*<!--\s*vi:section:speaker-turns\s*-->\s*\r?\n?/gim;

/** Removes machine-readable section markers from user-visible share/email markdown. */
export function stripShareNoteSectionMarkers(markdown: string): string {
  return markdown
    .replace(SHARE_SPEAKER_TURNS_SECTION_MARKER_LINE_RE, '')
    .replace(/<!--\s*vi:section:speaker-turns\s*-->/gi, '');
}
