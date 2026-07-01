import { IS_IOS } from '@/shared/lib/platform';

const IMPORT_EXT =
  /\.(m4a|mp4|mp3|wav|aac|caf|flac|ogg|opus|webm|aiff|aif|wma|3gp|amr|srt|vtt|sbv|sub|txt|md|markdown|pdf)(\?|$)/i;

/** iOS handoff paths: Documents/Inbox, *-Inbox (e.g. org.telegram.Telegram-Inbox), or /Inbox/ segment. */
const IOS_SHARED_IMPORT_PATH = /\/(Documents\/Inbox|[^/]+-Inbox|Inbox)\//i;

/** Share / Open-in drops under the app container (device or Simulator host file:// URL). */
const IOS_CONTAINER_HANDOFF_DIR = /\/(tmp|documents|library\/caches|inbox)\//i;

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

function fileUrlLooksLikeIosContainerHandoff(fileUrl: string): boolean {
  let dec = fileUrl;
  try {
    dec = decodeURI(fileUrl);
  } catch {
    /* keep raw */
  }
  const lower = dec.toLowerCase();
  const inAppContainer = lower.includes('/containers/data/application/');
  if (!inAppContainer) {
    return false;
  }
  return IOS_CONTAINER_HANDOFF_DIR.test(lower);
}

/** file:// from Linking on iOS (Share / Open in) — includes Simulator host paths outside Inbox. */
function fileUrlLooksLikeIosLinkingHandoff(fileUrl: string): boolean {
  if (!IS_IOS) {
    return false;
  }
  let dec = fileUrl;
  try {
    dec = decodeURI(fileUrl);
  } catch {
    /* keep raw */
  }
  const lower = dec.toLowerCase();
  if (!lower.startsWith('file://')) {
    return false;
  }
  if (lower.includes('/recordings/')) {
    return false;
  }
  if (lower.includes('/coresimulator/devices/')) {
    return true;
  }
  if (lower.includes('/private/var/')) {
    return true;
  }
  return false;
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

  if (fileUrlLooksLikeIosContainerHandoff(trimmed)) {
    return true;
  }

  if (fileUrlLooksLikeIosLinkingHandoff(trimmed)) {
    return true;
  }

  try {
    const { pathname } = new URL(trimmed);
    if (IMPORT_EXT.test(pathname)) return true;
    if (IOS_SHARED_IMPORT_PATH.test(pathname)) return true;
    if (fileUrlLooksLikeIosSharedImport(pathname)) return true;
    if (fileUrlLooksLikeIosContainerHandoff(pathname)) return true;
    if (fileUrlLooksLikeIosLinkingHandoff(pathname)) return true;
    return false;
  } catch {
    return (
      IMPORT_EXT.test(trimmed) ||
      fileUrlLooksLikeIosSharedImport(trimmed) ||
      fileUrlLooksLikeIosContainerHandoff(trimmed) ||
      fileUrlLooksLikeIosLinkingHandoff(trimmed)
    );
  }
}
