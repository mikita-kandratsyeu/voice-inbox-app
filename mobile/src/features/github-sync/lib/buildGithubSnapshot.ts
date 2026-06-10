import { DeviceInfoModule } from 'react-native-nitro-device-info';
import QuickCrypto from 'react-native-quick-crypto';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { buildShareText } from '@/features/share-record';
import { buildBackupPayload } from '@/features/sync-data';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';

import {
  GITHUB_HEAD_FORMAT_VERSION,
  GITHUB_SYNC_HEAD_FILE,
  GITHUB_SYNC_MANIFEST_FILE,
  GITHUB_SYNC_NOTES_DIR,
  GITHUB_SYNC_README_FILE,
} from './constants';
import { hashFileMap, sha256Hex } from './contentHash';

export type GithubSyncManifest = {
  version: 4;
  exportedAt: string;
  folders: Folder[];
  records: (Omit<VoiceRecord, 'audioPath'> & { audioPath?: string })[];
  graphLayouts: Awaited<ReturnType<typeof buildBackupPayload>>['graphLayouts'];
  syncMeta: {
    appVersion: string;
    deviceIdHash: string;
    contentHashes: Record<string, string>;
  };
};

export type GithubSnapshot = {
  files: Map<string, string>;
  contentHashes: Record<string, string>;
  manifest: GithubSyncManifest;
  recordCount: number;
  folderCount: number;
  graphLayoutCount: number;
};

function joinRepoPath(basePath: string, ...segments: string[]): string {
  const base = basePath.replace(/^\/+|\/+$/g, '');
  const rest = segments.map((s) => s.replace(/^\/+|\/+$/g, '')).filter(Boolean);
  return [base, ...rest].join('/');
}

function readAppVersion(): string {
  try {
    return String(DeviceInfoModule.version ?? '').trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function hashDeviceId(): Promise<string> {
  const deviceId = await getOrCreateDeviceId();
  const hash = QuickCrypto.createHash('sha256');
  hash.update(deviceId, 'utf8');
  return hash.digest('hex').slice(0, 16);
}

export async function buildGithubSnapshot(params: {
  records: VoiceRecord[];
  folders: Folder[];
  basePath: string;
}): Promise<GithubSnapshot> {
  const { records, folders, basePath } = params;
  const payload = await buildBackupPayload(records, folders, { includeAudio: false });

  const noteFiles = new Map<string, string>();
  const contentHashesByRecordId: Record<string, string> = {};

  for (const record of records) {
    const markdown = buildShareText(record, 'noteBrief');
    const notePath = joinRepoPath(basePath, GITHUB_SYNC_NOTES_DIR, `${record.id}.md`);
    noteFiles.set(notePath, markdown);
    contentHashesByRecordId[record.id] = sha256Hex(markdown);
  }

  const manifest: GithubSyncManifest = {
    ...payload,
    syncMeta: {
      appVersion: readAppVersion(),
      deviceIdHash: await hashDeviceId(),
      contentHashes: contentHashesByRecordId,
    },
  };

  const manifestPath = joinRepoPath(basePath, GITHUB_SYNC_MANIFEST_FILE);
  const manifestJson = JSON.stringify(manifest, null, 2);

  const headPath = joinRepoPath(basePath, GITHUB_SYNC_HEAD_FILE);
  const headJson = JSON.stringify(
    {
      formatVersion: GITHUB_HEAD_FORMAT_VERSION,
      lastSyncedAt: manifest.exportedAt,
      recordCount: records.length,
      appVersion: manifest.syncMeta.appVersion,
    },
    null,
    2,
  );

  const files = new Map<string, string>(noteFiles);
  files.set(manifestPath, manifestJson);
  files.set(headPath, headJson);

  if (records.length === 0) {
    const readmePath = joinRepoPath(basePath, GITHUB_SYNC_README_FILE);
    files.set(
      readmePath,
      '# Voice Inbox\n\nThis repository stores synced voice notes from Voice Inbox (markdown + metadata, no audio).\n',
    );
  }

  const contentHashes = hashFileMap(files);

  return {
    files,
    contentHashes,
    manifest,
    recordCount: records.length,
    folderCount: folders.length,
    graphLayoutCount: payload.graphLayouts.length,
  };
}
