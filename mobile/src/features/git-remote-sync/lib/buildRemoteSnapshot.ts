import { DeviceInfoModule } from 'react-native-nitro-device-info';
import QuickCrypto from 'react-native-quick-crypto';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { buildShareText } from '@/features/share-record';
import { buildBackupPayload } from '@/features/sync-data';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';

import {
  REMOTE_SYNC_AI_SETTINGS_FILE,
  REMOTE_SYNC_FOLDERS_FILE,
  REMOTE_SYNC_GRAPH_LAYOUTS_FILE,
  REMOTE_SYNC_HEAD_FILE,
  REMOTE_SYNC_HEAD_FORMAT_VERSION,
  REMOTE_SYNC_INDEX_FILE,
  REMOTE_SYNC_LEGACY_MANIFEST_FILE,
  REMOTE_SYNC_MANIFEST_FILE,
  REMOTE_SYNC_NOTES_DIR,
  REMOTE_SYNC_PRIVATE_REMOTE_PROFILES_FILE,
  REMOTE_SYNC_README_FILE,
  REMOTE_SYNC_RECORDS_FILE,
  REMOTE_SYNC_STRUCTURE_VERSION,
} from './constants';
import { hashFileMap, sha256Hex } from './contentHash';
import { buildRemoteSyncAiSettings } from './remoteSyncAiSettings';
import { buildRemoteSyncPrivateProfiles } from './remoteSyncPrivateProfiles';

export type RemoteSyncManifest = {
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

export type RemoteSyncIndexRecord = {
  id: string;
  path: string;
  hash: string;
  title: string;
  createdAt: string;
  updatedAt?: string | null;
  folderId?: string | null;
  classification?: VoiceRecord['classification'];
  tags?: string[];
};

export type RemoteSyncIndex = {
  structureVersion: typeof REMOTE_SYNC_STRUCTURE_VERSION;
  exportedAt: string;
  notesPath: typeof REMOTE_SYNC_NOTES_DIR;
  records: Record<string, RemoteSyncIndexRecord>;
};

export type RemoteSnapshot = {
  files: Map<string, string>;
  contentHashes: Record<string, string>;
  manifest: RemoteSyncManifest;
  index: RemoteSyncIndex;
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

function datePathFromIso(iso: string): string[] {
  const match = iso.match(/^(\d{4})-(\d{2})-/);
  if (!match) {
    return ['unknown'];
  }
  return [match[1], match[2]];
}

function slugForRecord(record: VoiceRecord): string {
  const rawTitle = record.title?.trim() || 'untitled';
  const sanitized = rawTitle
    .replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_')
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return sanitized || 'untitled';
}

function noteRelativePath(record: VoiceRecord): string {
  const [year, month] = datePathFromIso(record.createdAt);
  const day = record.createdAt.match(/^\d{4}-\d{2}-(\d{2})/)?.[1] ?? 'xx';
  return joinRepoPath(
    REMOTE_SYNC_NOTES_DIR,
    year,
    month,
    `${year}-${month}-${day}-${slugForRecord(record)}--${record.id}.md`,
  );
}

function yamlScalar(value: string): string {
  return JSON.stringify(value);
}

function yamlStringArray(values: string[] | undefined): string {
  if (!values || values.length === 0) return '[]';
  return `[${values.map(yamlScalar).join(', ')}]`;
}

function buildNoteFrontmatter(record: VoiceRecord, relativePath: string): string {
  const updatedAt =
    'updatedAt' in record && typeof record.updatedAt === 'string' ? record.updatedAt : null;
  const lines = [
    '---',
    `id: ${yamlScalar(record.id)}`,
    `path: ${yamlScalar(relativePath)}`,
    `createdAt: ${yamlScalar(record.createdAt)}`,
  ];

  if (updatedAt) lines.push(`updatedAt: ${yamlScalar(updatedAt)}`);
  lines.push(`title: ${yamlScalar(record.title ?? '')}`);
  if (record.folderId) lines.push(`folderId: ${yamlScalar(record.folderId)}`);
  if (record.classification) lines.push(`classification: ${yamlScalar(record.classification)}`);
  lines.push(`status: ${yamlScalar(record.status ?? 'unread')}`);
  lines.push(`tags: ${yamlStringArray(record.tags)}`);
  lines.push('---', '');
  return lines.join('\n');
}

function buildNoteMarkdown(record: VoiceRecord, relativePath: string): string {
  return `${buildNoteFrontmatter(record, relativePath)}${buildShareText(record, 'noteBrief')}`;
}

export async function buildRemoteSnapshot(params: {
  records: VoiceRecord[];
  folders: Folder[];
  basePath: string;
}): Promise<RemoteSnapshot> {
  const { records, folders, basePath } = params;
  const payload = await buildBackupPayload(records, folders, { includeAudio: false });

  const noteFiles = new Map<string, string>();
  const contentHashesByRecordId: Record<string, string> = {};
  const indexRecords: RemoteSyncIndex['records'] = {};

  for (const record of records) {
    const updatedAt =
      'updatedAt' in record && typeof record.updatedAt === 'string' ? record.updatedAt : null;
    const relativePath = noteRelativePath(record);
    const markdown = buildNoteMarkdown(record, relativePath);
    const notePath = joinRepoPath(basePath, relativePath);
    noteFiles.set(notePath, markdown);
    contentHashesByRecordId[record.id] = sha256Hex(markdown);
    indexRecords[record.id] = {
      id: record.id,
      path: relativePath,
      hash: contentHashesByRecordId[record.id],
      title: record.title ?? '',
      createdAt: record.createdAt,
      updatedAt,
      folderId: record.folderId ?? null,
      classification: record.classification,
      tags: record.tags ?? [],
    };
  }

  const manifest: RemoteSyncManifest = {
    ...payload,
    syncMeta: {
      appVersion: readAppVersion(),
      deviceIdHash: await hashDeviceId(),
      contentHashes: contentHashesByRecordId,
    },
  };

  const index: RemoteSyncIndex = {
    structureVersion: REMOTE_SYNC_STRUCTURE_VERSION,
    exportedAt: manifest.exportedAt,
    notesPath: REMOTE_SYNC_NOTES_DIR,
    records: indexRecords,
  };

  const manifestPath = joinRepoPath(basePath, REMOTE_SYNC_MANIFEST_FILE);
  const manifestJson = JSON.stringify(manifest, null, 2);
  const legacyManifestPath = joinRepoPath(basePath, REMOTE_SYNC_LEGACY_MANIFEST_FILE);

  const aiSettings = buildRemoteSyncAiSettings();
  const privateRemoteProfiles = buildRemoteSyncPrivateProfiles();
  const aiSettingsPath = joinRepoPath(basePath, REMOTE_SYNC_AI_SETTINGS_FILE);
  const privateRemoteProfilesPath = joinRepoPath(
    basePath,
    REMOTE_SYNC_PRIVATE_REMOTE_PROFILES_FILE,
  );

  const headPath = joinRepoPath(basePath, REMOTE_SYNC_HEAD_FILE);
  const headJson = JSON.stringify(
    {
      formatVersion: REMOTE_SYNC_HEAD_FORMAT_VERSION,
      structureVersion: REMOTE_SYNC_STRUCTURE_VERSION,
      lastSyncedAt: manifest.exportedAt,
      recordCount: records.length,
      folderCount: folders.length,
      graphLayoutCount: payload.graphLayouts.length,
      appVersion: manifest.syncMeta.appVersion,
      manifestPath: REMOTE_SYNC_MANIFEST_FILE,
      legacyManifestPath: REMOTE_SYNC_LEGACY_MANIFEST_FILE,
      recordsPath: REMOTE_SYNC_RECORDS_FILE,
      foldersPath: REMOTE_SYNC_FOLDERS_FILE,
      graphLayoutsPath: REMOTE_SYNC_GRAPH_LAYOUTS_FILE,
      indexPath: REMOTE_SYNC_INDEX_FILE,
      aiSettingsPath: REMOTE_SYNC_AI_SETTINGS_FILE,
      privateRemoteProfilesPath: REMOTE_SYNC_PRIVATE_REMOTE_PROFILES_FILE,
      notesPath: REMOTE_SYNC_NOTES_DIR,
    },
    null,
    2,
  );

  const files = new Map<string, string>(noteFiles);
  files.set(manifestPath, manifestJson);
  files.set(legacyManifestPath, manifestJson);
  files.set(
    joinRepoPath(basePath, REMOTE_SYNC_RECORDS_FILE),
    JSON.stringify(payload.records, null, 2),
  );
  files.set(joinRepoPath(basePath, REMOTE_SYNC_FOLDERS_FILE), JSON.stringify(folders, null, 2));
  files.set(
    joinRepoPath(basePath, REMOTE_SYNC_GRAPH_LAYOUTS_FILE),
    JSON.stringify(payload.graphLayouts, null, 2),
  );
  files.set(joinRepoPath(basePath, REMOTE_SYNC_INDEX_FILE), JSON.stringify(index, null, 2));
  files.set(aiSettingsPath, JSON.stringify(aiSettings, null, 2));
  files.set(privateRemoteProfilesPath, JSON.stringify(privateRemoteProfiles, null, 2));
  files.set(headPath, headJson);

  if (records.length === 0) {
    const readmePath = joinRepoPath(basePath, REMOTE_SYNC_README_FILE);
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
    index,
    recordCount: records.length,
    folderCount: folders.length,
    graphLayoutCount: payload.graphLayouts.length,
  };
}
