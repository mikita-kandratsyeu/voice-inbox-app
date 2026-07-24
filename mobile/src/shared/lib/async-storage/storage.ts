import { diagWarn } from '@/shared/lib/appLogger';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

export type StorageStats = {
  audioMb: number;
  transcriptKb: number;
  aiDataKb: number;
  cacheKb: number;
  totalMb: number;
};

export type RecordForStats = {
  transcript?: string;
  transcriptSegments?: unknown;
  summary?: string;
  tasks?: unknown;
};

const getDirectorySizeBytes = async (path: string, excludePaths?: Set<string>): Promise<number> => {
  let total = 0;
  const items = await NitroFS.readdir(path);

  for (const item of items) {
    if (excludePaths?.has(item.path)) {
      continue;
    }

    const st = await NitroFS.stat(item.path);

    if (st.isFile) {
      total += st.size;
    } else if (st.isDirectory) {
      total += await getDirectorySizeBytes(item.path, excludePaths);
    }
  }

  return total;
};

const clearDirectoryContents = async (
  path: string,
  keepPaths: Set<string>,
): Promise<{ deletedBytes: number }> => {
  const items = await NitroFS.readdir(path);
  let deletedBytes = 0;

  for (const item of items) {
    if (keepPaths.has(item.path)) {
      continue;
    }

    const st = await NitroFS.stat(item.path);

    if (st.isFile) {
      deletedBytes += st.size;
      await NitroFS.unlink(item.path);
    } else if (st.isDirectory) {
      const sub = await clearDirectoryContents(item.path, keepPaths);
      deletedBytes += sub.deletedBytes;

      const children = await NitroFS.readdir(item.path);

      if (children.length === 0) {
        await NitroFS.unlink(item.path);
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

/** Sum of file sizes for unique non-empty paths (e.g. trashed records’ audio). */
export const sumAudioFileSizesBytes = async (
  paths: Array<string | undefined | null>,
): Promise<number> => {
  const unique = new Set(paths.filter((p): p is string => Boolean(p)));
  let total = 0;
  for (const p of unique) {
    total += await getFileSize(p);
  }
  return total;
};

const getCacheSizeBytes = async (audioPaths: string[]): Promise<number> => {
  const excludeSet = new Set(audioPaths.filter(Boolean));
  const dir = getCachesDirectoryPath();

  try {
    const exists = await NitroFS.exists(dir);
    if (exists) {
      return await getDirectorySizeBytes(dir, excludeSet);
    }
  } catch (err) {
    diagWarn('[storage] Failed to get cache size:', dir, err);
  }
  return 0;
};

export const clearCache = async (audioPaths: string[]): Promise<number> => {
  const keepSet = new Set(audioPaths);
  const dir = getCachesDirectoryPath();
  let totalDeleted = 0;

  try {
    const exists = await NitroFS.exists(dir);

    if (!exists) {
      return 0;
    }

    const { deletedBytes } = await clearDirectoryContents(dir, keepSet);
    totalDeleted += deletedBytes;
  } catch (err) {
    diagWarn('[storage] Failed to clear cache dir:', dir, err);
  }

  return totalDeleted;
};

const transcriptPayloadBytes = (r: RecordForStats): number => {
  const transcript = new TextEncoder().encode(r.transcript ?? '').length;
  const segments = new TextEncoder().encode(JSON.stringify(r.transcriptSegments ?? [])).length;
  return transcript + segments;
};

const generationsPayloadBytes = (r: RecordForStats): number => {
  const summary = new TextEncoder().encode(r.summary ?? '').length;
  const tasks = new TextEncoder().encode(JSON.stringify(r.tasks ?? [])).length;
  return summary + tasks;
};

/** Same byte model as the “Generations” ring slice (transcript + segments + summary + tasks). */
export const computeAiDataBytes = (records: RecordForStats[]): number =>
  records.reduce((sum, r) => sum + transcriptPayloadBytes(r) + generationsPayloadBytes(r), 0);

/** Transcript + segment JSON only (for “in trash” under Transcripts). */
export const computeTranscriptPayloadBytes = (records: RecordForStats[]): number =>
  records.reduce((sum, r) => sum + transcriptPayloadBytes(r), 0);

export const getStorageStats = async (
  audioPaths: string[],
  records: RecordForStats[],
): Promise<StorageStats> => {
  let audioBytes = 0;

  for (const p of audioPaths) {
    if (p) audioBytes += await getFileSize(p);
  }

  /** Transcript text + segments only — not the SQLite file (empty DB still has page overhead). */
  const transcriptBytes = computeTranscriptPayloadBytes(records);
  const aiDataBytes = computeAiDataBytes(records);
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
