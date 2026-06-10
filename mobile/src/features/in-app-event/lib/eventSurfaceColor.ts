/** Matches `--bg` in web EVENT_DOCUMENT_STYLES (in-app event HTML). */
export function getInAppEventSurfaceColor(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '#121418' : '#ffffff';
}
