import {
  CloudStorage,
  CloudStorageError,
  CloudStorageErrorCode,
  CloudStorageProvider,
  CloudStorageScope,
} from 'react-native-cloud-storage';

import { joinRepoPath } from '@/features/git-remote-sync/lib/repoPaths';
import { IS_IOS } from '@/shared/lib';

const ICLOUD_SCOPE = CloudStorageScope.Documents;

let configured = false;

function ensureConfigured(): void {
  if (configured || !IS_IOS) {
    return;
  }
  CloudStorage.setProvider(CloudStorageProvider.ICloud);
  CloudStorage.setProviderOptions({
    scope: ICLOUD_SCOPE,
    documentsMode: 'icloud',
  });
  configured = true;
}

function isCloudStorageError(err: unknown): err is CloudStorageError {
  return err instanceof CloudStorageError;
}

export function isIcloudNativeSupported(): boolean {
  return IS_IOS;
}

export async function isIcloudAvailable(): Promise<boolean> {
  if (!isIcloudNativeSupported()) {
    return false;
  }
  ensureConfigured();
  try {
    return await CloudStorage.isCloudAvailable();
  } catch {
    return false;
  }
}

async function ensureDirectoryRecursive(dirPath: string): Promise<void> {
  const normalized = dirPath.replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return;
  }
  const parts = normalized.split('/');
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    try {
      await CloudStorage.mkdir(current, ICLOUD_SCOPE);
    } catch (err) {
      if (isCloudStorageError(err)) {
        if (err.code === CloudStorageErrorCode.FILE_ALREADY_EXISTS) {
          continue;
        }
        if (err.code === CloudStorageErrorCode.PATH_IS_FILE) {
          throw err;
        }
      }
      const exists = await CloudStorage.exists(current, ICLOUD_SCOPE).catch(() => false);
      if (!exists) {
        throw err;
      }
    }
  }
}

export async function ensureIcloudDirectory(relativePath: string): Promise<void> {
  ensureConfigured();
  await ensureDirectoryRecursive(relativePath);
}

export async function listIcloudRelativePaths(basePath: string): Promise<string[]> {
  ensureConfigured();
  const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
  const exists = await CloudStorage.exists(normalizedBase, ICLOUD_SCOPE).catch(() => false);
  if (!exists) {
    return [];
  }

  const out: string[] = [];

  async function walk(relativeDir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await CloudStorage.readdir(relativeDir, ICLOUD_SCOPE);
    } catch {
      return;
    }
    for (const name of entries) {
      const childPath = relativeDir ? `${relativeDir}/${name}` : name;
      try {
        const stat = await CloudStorage.stat(childPath, ICLOUD_SCOPE);
        if (stat.isDirectory()) {
          await walk(childPath);
        } else if (stat.isFile()) {
          out.push(childPath);
        }
      } catch {
        // Skip unreadable entries.
      }
    }
  }

  await walk(normalizedBase);
  return out;
}

export async function readIcloudRelativeFile(relativePath: string): Promise<string | null> {
  ensureConfigured();
  try {
    await CloudStorage.triggerSync(relativePath, ICLOUD_SCOPE).catch(() => {});
    return await CloudStorage.readFile(relativePath, ICLOUD_SCOPE);
  } catch (err) {
    if (isCloudStorageError(err) && err.code === CloudStorageErrorCode.FILE_NOT_FOUND) {
      return null;
    }
    throw err;
  }
}

export async function writeIcloudRelativeFile(
  relativePath: string,
  content: string,
): Promise<void> {
  ensureConfigured();
  const slashIndex = relativePath.lastIndexOf('/');
  if (slashIndex > 0) {
    await ensureDirectoryRecursive(relativePath.slice(0, slashIndex));
  }
  try {
    await CloudStorage.writeFile(relativePath, content, ICLOUD_SCOPE);
  } catch (err) {
    mapAndThrowWriteError(err);
  }
}

export async function deleteIcloudRelativePaths(paths: readonly string[]): Promise<void> {
  ensureConfigured();
  for (const path of paths) {
    try {
      const exists = await CloudStorage.exists(path, ICLOUD_SCOPE);
      if (!exists) {
        continue;
      }
      await CloudStorage.unlink(path, ICLOUD_SCOPE);
    } catch {
      // Best-effort deletion.
    }
  }
}

export async function writeIcloudRelativeFiles(params: {
  basePath: string;
  files: Map<string, string>;
  onProgress?: (uploaded: number, total: number) => void;
}): Promise<void> {
  ensureConfigured();
  const { files, onProgress } = params;
  const total = files.size;
  let uploaded = 0;

  for (const [path, content] of files.entries()) {
    await writeIcloudRelativeFile(path, content);
    uploaded += 1;
    onProgress?.(uploaded, total);
  }
}

export async function deleteIcloudDirectoryRecursive(relativePath: string): Promise<void> {
  ensureConfigured();
  try {
    const exists = await CloudStorage.exists(relativePath, ICLOUD_SCOPE);
    if (!exists) {
      return;
    }
    await CloudStorage.rmdir(relativePath, { recursive: true }, ICLOUD_SCOPE);
  } catch {
    // Best-effort cleanup.
  }
}

export function joinIcloudPath(basePath: string, ...segments: string[]): string {
  return joinRepoPath(basePath, segments.join('/'));
}

function mapAndThrowWriteError(err: unknown): never {
  if (isCloudStorageError(err)) {
    if (err.code === CloudStorageErrorCode.AUTHENTICATION_FAILED) {
      throw Object.assign(new Error('icloud_unavailable'), { code: 'icloud_unavailable' });
    }
    if (err.code === CloudStorageErrorCode.WRITE_ERROR) {
      throw Object.assign(new Error('icloud_quota_exceeded'), { code: 'icloud_quota_exceeded' });
    }
  }
  throw err;
}

export function mapIcloudNativeError(err: unknown): { code: string; message?: string } {
  if (err instanceof Error && 'code' in err && typeof err.code === 'string') {
    return { code: err.code, message: err.message };
  }
  if (isCloudStorageError(err)) {
    if (err.code === CloudStorageErrorCode.AUTHENTICATION_FAILED) {
      return { code: 'icloud_unavailable' };
    }
    if (err.code === CloudStorageErrorCode.WRITE_ERROR) {
      return { code: 'icloud_quota_exceeded' };
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  return { code: 'sync_failed', message };
}
