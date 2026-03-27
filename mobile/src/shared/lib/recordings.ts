import { getDocumentDirectoryPath, NitroFS } from '@/shared/lib/fs';

export const RECORDINGS_DIR = `${getDocumentDirectoryPath()}/recordings`;

const RECORDINGS_RELATIVE_PREFIX = 'recordings/';
const RECORDINGS_ABS_MARKER = '/recordings/';

function normalizeAudioPath(audioPath: string): string {
  return audioPath.startsWith('file://') ? audioPath.slice(7) : audioPath;
}

export function getRecordingsRelativePath(audioPath: string): string | null {
  const normalized = normalizeAudioPath(audioPath);
  if (normalized.startsWith(RECORDINGS_RELATIVE_PREFIX)) {
    return normalized;
  }

  const idx = normalized.lastIndexOf(RECORDINGS_ABS_MARKER);
  if (idx === -1) return null;

  return normalized.slice(idx + 1);
}

export function resolveAudioPath(audioPath: string): string {
  const normalized = normalizeAudioPath(audioPath);

  const relative = getRecordingsRelativePath(normalized);
  if (relative) {
    return `${getDocumentDirectoryPath()}/${relative}`;
  }

  return normalized;
}

export function audioPathToDbValue(audioPath: string | null | undefined): string | null {
  if (!audioPath?.trim()) return null;
  return getRecordingsRelativePath(audioPath) ?? audioPath;
}

export function audioPathFromDbValue(audioPath: string | null | undefined): string | undefined {
  if (!audioPath?.trim()) return undefined;
  return resolveAudioPath(audioPath);
}

export async function ensureRecordingsDir(): Promise<void> {
  const exists = await NitroFS.exists(RECORDINGS_DIR);
  if (!exists) {
    await NitroFS.mkdir(RECORDINGS_DIR);
  }
}

export async function persistRecordingToDocuments(
  sourcePath: string,
  recordId: string,
): Promise<string> {
  const normalized = sourcePath.startsWith('file://') ? sourcePath.slice(7) : sourcePath;

  if (normalized.startsWith(RECORDINGS_DIR)) {
    const ext = normalized.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
    const destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;
    if (normalized !== destPath) {
      try {
        await NitroFS.rename(normalized, destPath);
      } catch (err) {
        if (__DEV__) console.warn('[recordings] rename failed, using original path:', err);
        return normalized;
      }
      return destPath;
    }
    return normalized;
  }

  try {
    await ensureRecordingsDir();
    const ext = normalized.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
    const destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;
    await NitroFS.copyFile(normalized, destPath);
    try {
      await NitroFS.unlink(normalized);
    } catch {
      if (__DEV__) {
        console.warn('[recordings] Could not delete temp file after copy:', normalized);
      }
    }
    return destPath;
  } catch (err) {
    if (__DEV__) {
      console.warn('[recordings] persistRecordingToDocuments failed, using original path:', err);
    }
    return normalized;
  }
}
