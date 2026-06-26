import { types } from '@react-native-documents/picker';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import type { RemoteSyncAuxiliaryData } from '@/features/git-remote-sync/lib/applyRemoteSyncAuxiliaryData';
import { ensureRecordingsDir, i18n, RECORDINGS_DIR } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';
import {
  getCachesDirectoryPath,
  getReadableDocumentPickerFsPath,
  NitroFS,
  pickSingleFileToCachesDirectory,
} from '@/shared/lib/fs';
import { isPasswordProtected, unzip, unzipWithPassword } from '@/shared/lib/zip';

import { readBackupAuxiliarySettings } from './backupAuxiliarySettings';
import {
  type BackupExportPayload,
  type BackupGraphLayoutVersion,
  buildLegacyBackupFolders,
  normalizeBackupFolders,
  normalizeBackupGraphLayouts,
  normalizeImportedVoiceRecord,
  parseBackupMetadataPayload,
} from './backupMetadata';

const METADATA_FILENAME = 'metadata.json';

type ExportPayload = BackupExportPayload;

/** Machine-readable import error for UI branching (not shown to users). */
export const IMPORT_ERROR_WRONG_BACKUP_PASSWORD = '__wrong_backup_password__' as const;

export type ImportDataOptions = {
  password?: string;
  /** Retry import after user enters password (file already in app cache). */
  zipFsPath?: string;
};

export type ImportResult =
  | {
      success: true;
      records: VoiceRecord[];
      folders: Folder[];
      legacyFolders: Folder[];
      exportedAt: string;
      graphLayouts: BackupGraphLayoutVersion[];
      remoteSyncAuxiliary?: RemoteSyncAuxiliaryData;
    }
  | { success: false; error: 'cancelled' | string }
  | { success: false; needsPassword: true; zipFsPath: string };

function extractGraphLayouts(payload: ExportPayload): BackupGraphLayoutVersion[] {
  if (payload.version !== 4) {
    return [];
  }
  return normalizeBackupGraphLayouts(payload.graphLayouts);
}

function parseExportPayload(raw: unknown): ExportPayload | null {
  return parseBackupMetadataPayload(raw);
}

function isRelativeAudioPath(path: string): boolean {
  const p = path.trim();

  return p.length > 0 && !p.startsWith('/') && !p.startsWith('file://');
}

function toFsPath(uri: string): string {
  const noScheme = uri.startsWith('file://') ? uri.slice(7) : uri;
  const noSuffix = noScheme.split('?')[0]?.split('#')[0] ?? noScheme;
  try {
    return decodeURIComponent(noSuffix);
  } catch {
    return noSuffix;
  }
}

function pathOrNameLooksLikeZip(uri: string, name: string): boolean {
  const n = name.trim().toLowerCase();
  if (n.endsWith('.zip')) {
    return true;
  }
  const pathOnly = uri.split('?')[0].split('#')[0].toLowerCase();
  return pathOnly.endsWith('.zip');
}

function isPathInsideDir(path: string, dir: string): boolean {
  const normalizedPath = path.replace(/\/+$/, '');
  const normalizedDir = dir.replace(/\/+$/, '');
  return normalizedPath === normalizedDir || normalizedPath.startsWith(`${normalizedDir}/`);
}

async function unlinkIfExists(path: string): Promise<void> {
  try {
    const exists = await NitroFS.exists(path);
    if (exists) {
      await NitroFS.unlink(path);
    }
  } catch {
    diagWarn('[unlinkIfExists] failed to unlink', { path });
  }
}

async function fileHasZipLocalHeader(fsPath: string): Promise<boolean> {
  try {
    const isExists = await NitroFS.exists(fsPath);

    if (!isExists) {
      return false;
    }
    const head = (await NitroFS.readFile(fsPath, 'ascii')).slice(0, 2);
    return head === 'PK';
  } catch {
    return false;
  }
}

async function shouldTreatAsZipArchive(uri: string, name: string): Promise<boolean> {
  if (pathOrNameLooksLikeZip(uri, name)) {
    return true;
  }
  return fileHasZipLocalHeader(toFsPath(uri));
}

async function copyAudioFromExtractToApp(
  extractDir: string,
  relativeAudioPath: string,
  recordId: string,
): Promise<string | undefined> {
  const fullPath = `${extractDir}/${relativeAudioPath}`.replace(/\/+/g, '/');
  const normalized = fullPath.startsWith('file://') ? fullPath.slice(7) : fullPath;
  const exists = await NitroFS.exists(normalized);

  if (!exists) {
    return undefined;
  }

  await ensureRecordingsDir();

  const ext = normalized.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
  const destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;

  try {
    const destExists = await NitroFS.exists(destPath);
    if (destExists) {
      await NitroFS.unlink(destPath);
    }

    await NitroFS.copyFile(normalized, destPath);

    return destPath;
  } catch {
    return undefined;
  }
}

async function readTextWithFileSchemeFallback(
  path: string,
  encoding: 'utf8' | 'ascii',
): Promise<string> {
  try {
    return await NitroFS.readFile(path, encoding);
  } catch {
    return NitroFS.readFile(`file://${path}`, encoding);
  }
}

function decodeBase64ToUtf8(base64: string): string {
  const binary = atob(base64);
  let escaped = '';
  for (let i = 0; i < binary.length; i += 1) {
    escaped += `%${binary.charCodeAt(i).toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(escaped);
}

async function readUtf8WithAllFallbacks(path: string): Promise<string> {
  try {
    return await NitroFS.readFile(path, 'utf8');
  } catch {
    try {
      return await NitroFS.readFile(`file://${path}`, 'utf8');
    } catch {
      try {
        const base64 = await NitroFS.readFile(path, 'base64');
        return decodeBase64ToUtf8(base64);
      } catch {
        const base64 = await NitroFS.readFile(`file://${path}`, 'base64');
        return decodeBase64ToUtf8(base64);
      }
    }
  }
}

async function extractZipArchive(
  zipPath: string,
  extractDir: string,
  password?: string,
): Promise<'ok' | 'needs_password' | 'wrong_password' | 'failed'> {
  let protectedZip = false;
  try {
    protectedZip = await isPasswordProtected(zipPath);
  } catch {
    protectedZip = false;
  }

  if (protectedZip) {
    const trimmed = password?.trim();
    if (!trimmed) {
      return 'needs_password';
    }
    try {
      await unzipWithPassword(zipPath, extractDir, trimmed);
      return 'ok';
    } catch {
      return 'wrong_password';
    }
  }

  try {
    await unzip(zipPath, extractDir);
    return 'ok';
  } catch {
    const trimmed = password?.trim();
    if (trimmed) {
      try {
        await unzipWithPassword(zipPath, extractDir, trimmed);
        return 'ok';
      } catch {
        return 'wrong_password';
      }
    }
    return 'failed';
  }
}

async function importFromZip(fileUri: string, password?: string): Promise<ImportResult> {
  const timestamp = Date.now();
  const extractDir = `${getCachesDirectoryPath()}/import-extract-${timestamp}`;
  const zipPath = toFsPath(fileUri);

  const extractResult = await extractZipArchive(zipPath, extractDir, password);
  if (extractResult === 'needs_password') {
    await removeDirRecursive(extractDir).catch(() => {});
    return { success: false, needsPassword: true, zipFsPath: zipPath };
  }
  if (extractResult === 'wrong_password') {
    await removeDirRecursive(extractDir).catch(() => {});
    return { success: false, error: IMPORT_ERROR_WRONG_BACKUP_PASSWORD };
  }
  if (extractResult === 'failed') {
    await removeDirRecursive(extractDir).catch(() => {});
    return { success: false, error: i18n.t('importExport.invalidFormat') };
  }

  try {
    const metadataPath = `${extractDir}/${METADATA_FILENAME}`;
    const metadataExists = await NitroFS.exists(metadataPath);

    if (!metadataExists) {
      return { success: false, error: i18n.t('importExport.invalidFormat') };
    }

    const raw = await readUtf8WithAllFallbacks(metadataPath);

    const payload = parseExportPayload(JSON.parse(raw));

    if (!payload) {
      return { success: false, error: i18n.t('importExport.invalidFormat') };
    }

    const records: VoiceRecord[] = [];

    for (const r of payload.records) {
      const record = normalizeImportedVoiceRecord(r) as VoiceRecord & { audioPath?: string };
      const relativePath = record.audioPath;

      if (
        (payload.version === 2 || payload.version === 3 || payload.version === 4) &&
        relativePath &&
        isRelativeAudioPath(relativePath)
      ) {
        const newPath = await copyAudioFromExtractToApp(extractDir, relativePath, record.id);
        if (newPath) {
          record.audioPath = newPath;
        } else {
          delete record.audioPath;
        }
      } else {
        delete record.audioPath;
      }

      records.push(record as VoiceRecord);
    }

    const remoteSyncAuxiliary = await readBackupAuxiliarySettings(extractDir);

    return {
      success: true,
      records,
      folders:
        payload.version === 3 || payload.version === 4
          ? normalizeBackupFolders(payload.folders)
          : [],
      legacyFolders:
        payload.version !== 3 && payload.version !== 4
          ? buildLegacyBackupFolders(payload.records)
          : [],
      exportedAt: payload.exportedAt,
      graphLayouts: extractGraphLayouts(payload),
      remoteSyncAuxiliary,
    };
  } finally {
    await removeDirRecursive(extractDir).catch(() => {});
  }
}

async function removeDirRecursive(path: string): Promise<void> {
  const items = await NitroFS.readdir(path);

  for (const item of items) {
    const st = await NitroFS.stat(item.path);

    if (st.isFile) {
      await NitroFS.unlink(item.path);
    } else {
      await removeDirRecursive(item.path);
    }
  }
  await NitroFS.unlink(path);
}

export const importData = async (options?: ImportDataOptions): Promise<ImportResult> => {
  let pickedFsPath: string | null = options?.zipFsPath ?? null;
  let keepPickedFileInCache = false;

  try {
    let fsPath = pickedFsPath;
    let uri: string | undefined;
    let fileName = '';

    if (!fsPath) {
      const picked = await pickSingleFileToCachesDirectory({
        type: [types.allFiles],
      });

      if (picked.kind === 'canceled') {
        return { success: false, error: 'cancelled' };
      }
      if (picked.kind === 'failed') {
        diagWarn('[importData] pick/copy failed', picked.message);
        return { success: false, error: i18n.t('importExport.fileNotSelected') };
      }

      const fileLike = {
        uri: picked.localUri,
        fileUri: picked.localUri,
        fileCopyUri: picked.localUri,
        name: picked.name ?? undefined,
      };
      fsPath = await getReadableDocumentPickerFsPath(fileLike);
      pickedFsPath = fsPath;
      uri = fileLike.fileCopyUri ?? fileLike.fileUri ?? fileLike.uri;
      fileName = fileLike.name ?? '';

      if (!uri || !fsPath) {
        diagWarn('[importData] picker path is not readable', {
          uri: fileLike.uri,
          fileUri: fileLike.fileUri,
          fileCopyUri: fileLike.fileCopyUri,
        });
        return { success: false, error: i18n.t('importExport.fileNotSelected') };
      }
    }

    if (!fsPath) {
      return { success: false, error: i18n.t('importExport.fileNotSelected') };
    }

    const isZip = options?.zipFsPath
      ? true
      : uri != null && uri.length > 0
        ? await shouldTreatAsZipArchive(uri, fileName)
        : await fileHasZipLocalHeader(fsPath);

    if (isZip) {
      const zipResult = await importFromZip(fsPath, options?.password);
      if (!zipResult.success && 'needsPassword' in zipResult && zipResult.needsPassword) {
        keepPickedFileInCache = true;
      }
      return zipResult;
    }

    const raw = await readTextWithFileSchemeFallback(fsPath, 'utf8');
    const payload = parseExportPayload(JSON.parse(raw));

    if (!payload) {
      return { success: false, error: i18n.t('importExport.invalidFormat') };
    }

    const records = payload.records.map((r) => {
      const record = normalizeImportedVoiceRecord(r) as VoiceRecord;
      delete (record as { audioPath?: string }).audioPath;
      return record;
    });

    return {
      success: true,
      records,
      folders:
        payload.version === 3 || payload.version === 4
          ? normalizeBackupFolders(payload.folders)
          : [],
      legacyFolders:
        payload.version !== 3 && payload.version !== 4
          ? buildLegacyBackupFolders(payload.records)
          : [],
      exportedAt: payload.exportedAt,
      graphLayouts: extractGraphLayouts(payload),
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;

    if (code === 'OPERATION_CANCELED') {
      return { success: false, error: 'cancelled' };
    }

    return { success: false, error: i18n.t('importExport.readError') };
  } finally {
    if (
      pickedFsPath &&
      !keepPickedFileInCache &&
      isPathInsideDir(pickedFsPath, getCachesDirectoryPath())
    ) {
      await unlinkIfExists(pickedFsPath);
    }
  }
};
