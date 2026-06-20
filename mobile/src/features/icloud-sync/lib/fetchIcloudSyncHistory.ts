import { joinRepoPath } from '@/features/git-remote-sync/lib/repoPaths';

import {
  ICLOUD_SYNC_DEFAULT_BASE_PATH,
  ICLOUD_SYNC_VERSION_META_FILE,
  ICLOUD_SYNC_VERSIONS_DIR,
} from './constants';
import { listIcloudRelativePaths, readIcloudRelativeFile } from './icloudNative';

export type IcloudSyncVersionSummary = {
  versionId: string;
  label: string;
  exportedAt: string;
  recordCount: number;
  folderCount: number;
};

type VersionMeta = {
  label?: string;
  exportedAt?: string;
  recordCount?: number;
  folderCount?: number;
};

function parseVersionMeta(raw: string | null): VersionMeta | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as VersionMeta;
  } catch {
    return null;
  }
}

function versionIdFromMetaPath(path: string, versionsRoot: string): string | null {
  if (!path.startsWith(`${versionsRoot}/`)) {
    return null;
  }
  const rest = path.slice(versionsRoot.length + 1);
  const versionId = rest.split('/')[0];
  return versionId || null;
}

export async function fetchIcloudSyncHistory(params?: {
  basePath?: string;
}): Promise<IcloudSyncVersionSummary[]> {
  const basePath = params?.basePath ?? ICLOUD_SYNC_DEFAULT_BASE_PATH;
  const versionsRoot = joinRepoPath(basePath, ICLOUD_SYNC_VERSIONS_DIR);
  const paths = await listIcloudRelativePaths(versionsRoot);

  const versionIds = new Set<string>();
  for (const path of paths) {
    const versionId = versionIdFromMetaPath(path, versionsRoot);
    if (versionId) {
      versionIds.add(versionId);
    }
  }

  const summaries: IcloudSyncVersionSummary[] = [];

  for (const versionId of versionIds) {
    const metaPath = joinRepoPath(
      basePath,
      `${ICLOUD_SYNC_VERSIONS_DIR}/${versionId}/${ICLOUD_SYNC_VERSION_META_FILE}`,
    );
    const meta = parseVersionMeta(await readIcloudRelativeFile(metaPath));
    summaries.push({
      versionId,
      label: meta?.label?.trim() || 'Voice Inbox AI backup',
      exportedAt: meta?.exportedAt?.trim() || versionId,
      recordCount: typeof meta?.recordCount === 'number' ? meta.recordCount : 0,
      folderCount: typeof meta?.folderCount === 'number' ? meta.folderCount : 0,
    });
  }

  return summaries.sort((a, b) => b.exportedAt.localeCompare(a.exportedAt));
}
