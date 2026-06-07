import { diagWarn } from '@/shared/lib/appLogger';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

const SHARE_EXPORT_DIR_NAME = 'voice-inbox-share';

export const SHARE_EXPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const getShareExportDirectoryPath = (): string =>
  `${getCachesDirectoryPath()}/${SHARE_EXPORT_DIR_NAME}`;

export async function ensureShareExportDirectory(): Promise<void> {
  const dir = getShareExportDirectoryPath();
  if (await NitroFS.exists(dir)) return;
  await NitroFS.mkdir(dir);
}

export async function pruneShareExportCache(maxAgeMs = SHARE_EXPORT_MAX_AGE_MS): Promise<void> {
  const dir = getShareExportDirectoryPath();
  if (!(await NitroFS.exists(dir))) return;

  const maxAgeSec = maxAgeMs / 1000;
  const nowSec = Date.now() / 1000;

  let items: Awaited<ReturnType<typeof NitroFS.readdir>>;
  try {
    items = await NitroFS.readdir(dir);
  } catch {
    return;
  }

  for (const item of items) {
    try {
      const st = await NitroFS.stat(item.path);
      if (!st.isFile) continue;
      if (nowSec - st.mtime > maxAgeSec) {
        await NitroFS.unlink(item.path);
      }
    } catch {
      diagWarn('[pruneShareExportCache] failed to unlink', item.path);
    }
  }
}
