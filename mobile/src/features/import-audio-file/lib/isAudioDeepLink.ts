const AUDIO_EXT = /\.(m4a|mp3|wav|aac|caf|flac|ogg|opus|webm|aiff|aif|wma|3gp|amr)(\?|$)/i;

/** iOS handoff paths: Documents/Inbox, *-Inbox (e.g. org.telegram.Telegram-Inbox), or /Inbox/ segment. */
const IOS_SHARED_IMPORT_PATH = /\/(Documents\/Inbox|[^/]+-Inbox|Inbox)\//i;

/** RN / iOS sometimes hand off odd `file://` encodings; substring checks are more robust than pathname-only. */
function fileUrlLooksLikeIosSharedImport(fileUrl: string): boolean {
  let dec = fileUrl;
  try {
    dec = decodeURI(fileUrl);
  } catch {
    /* keep raw */
  }
  const lower = dec.toLowerCase();
  return (
    lower.includes('/documents/inbox/') || lower.includes('-inbox/') || lower.includes('/inbox/')
  );
}

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

  if (fileUrlLooksLikeIosSharedImport(trimmed)) {
    return true;
  }

  try {
    const { pathname } = new URL(trimmed);
    if (AUDIO_EXT.test(pathname)) return true;
    if (IOS_SHARED_IMPORT_PATH.test(pathname)) return true;
    if (fileUrlLooksLikeIosSharedImport(pathname)) return true;
    return false;
  } catch {
    return AUDIO_EXT.test(trimmed) || fileUrlLooksLikeIosSharedImport(trimmed);
  }
}
