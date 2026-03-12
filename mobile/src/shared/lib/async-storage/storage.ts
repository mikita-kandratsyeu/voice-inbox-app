import { IOS_DOCUMENT_PATH } from '@op-engineering/op-sqlite';
import RNFS from 'react-native-fs';

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
const DB_PATH = `${IOS_DOCUMENT_PATH ?? RNFS.DocumentDirectoryPath}/${DB_NAME}`;

const getDirectorySizeBytes = (path: string, excludePaths?: Set<string>): Promise<number> =>
  RNFS.readDir(path).then(async (items) => {
    let total = 0;

    for (const item of items) {
      if (excludePaths?.has(item.path)) {
        continue;
      }

      if (item.isFile()) {
        total += item.size;
      } else if (item.isDirectory()) {
        total += await getDirectorySizeBytes(item.path, excludePaths);
      }
    }

    return total;
  });

const clearDirectoryContents = async (
  path: string,
  keepPaths: Set<string>,
): Promise<{ deletedBytes: number }> => {
  const items = await RNFS.readDir(path);
  let deletedBytes = 0;

  for (const item of items) {
    if (keepPaths.has(item.path)) {
      continue;
    }

    if (item.isFile()) {
      deletedBytes += item.size;
      await RNFS.unlink(item.path);
    } else if (item.isDirectory()) {
      const sub = await clearDirectoryContents(item.path, keepPaths);
      deletedBytes += sub.deletedBytes;

      const isEmpty = (await RNFS.readDir(item.path)).length === 0;

      if (isEmpty) {
        await RNFS.unlink(item.path);
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
    const exists = await RNFS.exists(normalizedPath);

    if (!exists) {
      return 0;
    }

    const stat = await RNFS.stat(normalizedPath);

    return stat.size;
  } catch {
    return 0;
  }
};

const getCacheSizeBytes = async (audioPaths: string[]): Promise<number> => {
  const excludeSet = new Set(audioPaths.filter(Boolean));
  const dirs = [
    RNFS.CachesDirectoryPath,
    ...(RNFS.TemporaryDirectoryPath !== RNFS.CachesDirectoryPath
      ? [RNFS.TemporaryDirectoryPath]
      : []),
  ];

  let total = 0;
  for (const dir of dirs) {
    try {
      const exists = await RNFS.exists(dir);
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
  const dirs = [
    RNFS.CachesDirectoryPath,
    ...(RNFS.TemporaryDirectoryPath !== RNFS.CachesDirectoryPath
      ? [RNFS.TemporaryDirectoryPath]
      : []),
  ];
  let totalDeleted = 0;

  for (const dir of dirs) {
    try {
      const exists = await RNFS.exists(dir);

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
