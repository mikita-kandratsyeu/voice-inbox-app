import RNFS from 'react-native-fs';

export const RECORDINGS_DIR = `${RNFS.DocumentDirectoryPath}/recordings`;

export async function ensureRecordingsDir(): Promise<void> {
  const exists = await RNFS.exists(RECORDINGS_DIR);
  if (!exists) {
    await RNFS.mkdir(RECORDINGS_DIR);
  }
}

export async function persistRecordingToDocuments(
  sourcePath: string,
  recordId: string,
): Promise<string> {
  const normalized = sourcePath.startsWith('file://') ? sourcePath.slice(7) : sourcePath;
  await ensureRecordingsDir();
  const ext = normalized.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
  const destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;
  await RNFS.copyFile(normalized, destPath);
  try {
    await RNFS.unlink(normalized);
  } catch {
    if (__DEV__) {
      console.warn('[recordings] Could not delete temp file after copy:', normalized);
    }
  }

  return destPath;
}
