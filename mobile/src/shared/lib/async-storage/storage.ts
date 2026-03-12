import { ANDROID_DATABASE_PATH, IOS_DOCUMENT_PATH } from '@op-engineering/op-sqlite';
import { Platform } from 'react-native';
import NitroFS from 'react-native-nitro-fs';

export type StorageStats = {
  audioMb: number;
  transcriptKb: number;
  aiDataKb: number;
  cacheKb: number;
  totalMb: number;
};

type RecordForStats = {
  transcript?: string;
  transcriptSegments?: unknown;
  summary?: string;
  tasks?: unknown;
};

const DB_NAME = 'voice-inbox.db';
const DOCUMENT_DIR = NitroFS.DOCUMENT_DIR;

const DB_PATH =
  Platform.OS === 'android'
    ? `${ANDROID_DATABASE_PATH ?? DOCUMENT_DIR}/${DB_NAME}`
    : `${IOS_DOCUMENT_PATH ?? DOCUMENT_DIR}/${DB_NAME}`;

const getDirectorySizeBytes = (path: string, excludePaths?: Set<string>): Promise<number> =>
  NitroFS.readdir(path).then(async (items) => {
    let total = 0;

    for (const item of items) {
      const fullPath = item.path;
      if (excludePaths?.has(fullPath)) {
        continue;
      }

      const stat = await NitroFS.stat(fullPath);
      if (stat.isFile) {
        total += stat.size;
      } else if (stat.isDirectory) {
        total += await getDirectorySizeBytes(fullPath, excludePaths);
      }
    }

    return total;
  });

const clearDirectoryContents = async (
  path: string,
  keepPaths: Set<string>,
): Promise<{ deletedBytes: number }> => {
  const items = await NitroFS.readdir(path);
  let deletedBytes = 0;

  for (const item of items) {
    const fullPath = item.path;
    if (keepPaths.has(fullPath)) {
      continue;
    }

    const stat = await NitroFS.stat(fullPath);
    if (stat.isFile) {
      deletedBytes += stat.size;
      await NitroFS.unlink(fullPath);
    } else if (stat.isDirectory) {
      const sub = await clearDirectoryContents(fullPath, keepPaths);
      deletedBytes += sub.deletedBytes;

      const isEmpty = (await NitroFS.readdir(fullPath)).length === 0;

      if (isEmpty) {
        await NitroFS.unlink(fullPath);
      }
    }
  }
  return { deletedBytes };
};

const normalizeFilePath = (path: string): string =>
  path.startsWith('file://') ? path.slice(7) : path;

const getFileSize = async (path: string): Promise<number> => {
  try {
    const normalizedPath = normalizeFilePath(path);
    const exists = await NitroFS.exists(normalizedPath);

    if (!exists) {
      return 0;
    }

    const stat = await NitroFS.stat(normalizedPath);

    return stat.size;
  } catch {
    return 0;
  }
};

const getCacheSizeBytes = async (audioPaths: string[]): Promise<number> => {
  const excludeSet = new Set(audioPaths.filter(Boolean));
  const dirs = [NitroFS.CACHE_DIR];

  let total = 0;
  for (const dir of dirs) {
    try {
      const exists = await NitroFS.exists(dir);
      if (exists) {
        total += await getDirectorySizeBytes(dir, excludeSet);
      }
    } catch (err) {
      if (__DEV__) console.warn('[storage] Failed to get cache size:', dir, err);
    }
  }
  return total;
};

export const clearCache = async (audioPaths: string[]): Promise<number> => {
  const keepSet = new Set(audioPaths);
  const dirs = [NitroFS.CACHE_DIR];
  let totalDeleted = 0;

  for (const dir of dirs) {
    try {
      const exists = await NitroFS.exists(dir);

      if (!exists) {
        continue;
      }

      const { deletedBytes } = await clearDirectoryContents(dir, keepSet);
      totalDeleted += deletedBytes;
    } catch (err) {
      if (__DEV__) console.warn('[storage] Failed to clear cache dir:', dir, err);
    }
  }

  return totalDeleted;
};

const getAiDataBytes = (records: RecordForStats[]): number =>
  records.reduce((sum, r) => {
    const transcript = new TextEncoder().encode(r.transcript ?? '').length;
    const segments = new TextEncoder().encode(JSON.stringify(r.transcriptSegments ?? [])).length;
    const summary = new TextEncoder().encode(r.summary ?? '').length;
    const tasks = new TextEncoder().encode(JSON.stringify(r.tasks ?? [])).length;

    return sum + transcript + segments + summary + tasks;
  }, 0);

export const getStorageStats = async (
  audioPaths: string[],
  records: RecordForStats[],
): Promise<StorageStats> => {
  let audioBytes = 0;

  for (const p of audioPaths) {
    if (p) audioBytes += await getFileSize(p);
  }

  const transcriptBytes = await getFileSize(DB_PATH);
  const aiDataBytes = getAiDataBytes(records);
  const cacheBytes = await getCacheSizeBytes(audioPaths);

  const totalBytes = audioBytes + transcriptBytes + cacheBytes;

  return {
    audioMb: audioBytes / (1024 * 1024),
    transcriptKb: transcriptBytes / 1024,
    aiDataKb: aiDataBytes / 1024,
    cacheKb: cacheBytes / 1024,
    totalMb: totalBytes / (1024 * 1024),
  };
};
