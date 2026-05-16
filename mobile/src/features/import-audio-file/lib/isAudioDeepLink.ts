const AUDIO_EXT = /\.(m4a|mp3|wav|aac|caf|flac|ogg|opus|webm|aiff|aif|wma|3gp|amr)(\?|$)/i;

/** file:// or content:// URIs we treat as audio handoff from another app (Open in / Share). */
export function isAudioImportDeepLinkUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('content://')) {
    return true;
  }

  if (!trimmed.startsWith('file://')) {
    return false;
  }

  try {
    const { pathname } = new URL(trimmed);
    return AUDIO_EXT.test(pathname);
  } catch {
    return AUDIO_EXT.test(trimmed);
  }
}
