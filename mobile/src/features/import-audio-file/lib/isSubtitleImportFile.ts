const SUBTITLE_EXT = /\.(vtt|srt)(\?.*)?$/i;

export function isSubtitleImportFileName(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  return SUBTITLE_EXT.test(name.trim());
}

export function subtitleFormatFromFileName(name: string | null | undefined): 'vtt' | 'srt' | null {
  if (!name?.trim()) return null;
  const lower = name.trim().toLowerCase();
  if (lower.endsWith('.vtt')) return 'vtt';
  if (lower.endsWith('.srt')) return 'srt';
  return null;
}
