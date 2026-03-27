import DocumentPicker from 'react-native-document-picker';
import { unzip } from 'react-native-zip-archive';

import type { Folder } from '@/entities/folder';
import { useFolderStore } from '@/entities/folder';
import { folderRepository } from '@/entities/folder/model/repository';
import type { RecordClassification, VoiceRecord } from '@/entities/record';
import {
  ensureRecordingsDir,
  i18n,
  isArray,
  isString,
  isStringArrayItem,
  RECORDINGS_DIR,
} from '@/shared/lib';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

const METADATA_FILENAME = 'metadata.json';

type ExportPayloadV1 = {
  version: 1;
  exportedAt: string;
  records: Omit<VoiceRecord, 'audioPath'>[];
};

type ExportPayloadV2 = {
  version: 2;
  exportedAt: string;
  records: (Omit<VoiceRecord, 'audioPath'> & { audioPath?: string })[];
};

type ExportPayloadV3 = {
  version: 3;
  exportedAt: string;
  folders: Folder[];
  records: (Omit<VoiceRecord, 'audioPath'> & { audioPath?: string })[];
};

type ExportPayload = ExportPayloadV1 | ExportPayloadV2 | ExportPayloadV3;

type ImportResult =
  | { success: true; records: VoiceRecord[]; exportedAt: string }
  | { success: false; error: string };

const VALID_CLASSIFICATIONS: RecordClassification[] = [
  'personal',
  'work',
  'meeting',
  'idea',
  'other',
];

function normalizeRecord(raw: unknown): VoiceRecord {
  const base = raw as Partial<VoiceRecord>;

  const classification: VoiceRecord['classification'] =
    isString(base.classification) &&
    VALID_CLASSIFICATIONS.includes(base.classification as RecordClassification)
      ? (base.classification as RecordClassification)
      : undefined;

  const keyPhrases: string[] = isArray(base.keyPhrases)
    ? base.keyPhrases.filter(isStringArrayItem)
    : [];

  const nextSteps: string[] = isArray(base.nextSteps)
    ? base.nextSteps.filter(isStringArrayItem)
    : [];

  return {
    ...base,
    classification: classification ?? base.classification,
    keyPhrases: keyPhrases.length > 0 ? keyPhrases : (base.keyPhrases ?? []),
    nextSteps: nextSteps.length > 0 ? nextSteps : (base.nextSteps ?? []),
    translatedTranscript: isString(base.translatedTranscript)
      ? base.translatedTranscript
      : undefined,
    translationLanguage: isString(base.translationLanguage) ? base.translationLanguage : undefined,
  } as VoiceRecord;
}

function isRelativeAudioPath(path: string): boolean {
  const p = path.trim();

  return p.length > 0 && !p.startsWith('/') && !p.startsWith('file://');
}

function toFsPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

function pathOrNameLooksLikeZip(uri: string, name: string): boolean {
  const n = name.trim().toLowerCase();
  if (n.endsWith('.zip')) {
    return true;
  }
  const pathOnly = uri.split('?')[0].split('#')[0].toLowerCase();
  return pathOnly.endsWith('.zip');
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
    await NitroFS.copyFile(normalized, destPath);

    return destPath;
  } catch {
    return undefined;
  }
}

async function importFromZip(fileUri: string): Promise<ImportResult> {
  const timestamp = Date.now();
  const extractDir = `${getCachesDirectoryPath()}/import-extract-${timestamp}`;
  const zipPath = toFsPath(fileUri);

  try {
    await unzip(zipPath, extractDir);
  } catch {
    return { success: false, error: i18n.t('importExport.invalidFormat') };
  }

  const metadataPath = `${extractDir}/${METADATA_FILENAME}`;
  const metadataExists = await NitroFS.exists(metadataPath);

  if (!metadataExists) {
    await removeDirRecursive(extractDir);
    return { success: false, error: i18n.t('importExport.invalidFormat') };
  }

  const raw = await NitroFS.readFile(metadataPath, 'utf8');
  const payload = JSON.parse(raw) as ExportPayload;

  if (
    (payload.version !== 1 && payload.version !== 2 && payload.version !== 3) ||
    !isArray(payload.records)
  ) {
    await removeDirRecursive(extractDir);

    return { success: false, error: i18n.t('importExport.invalidFormat') };
  }

  if (payload.version === 3 && isArray(payload.folders)) {
    const foldersToRestore = payload.folders
      .filter(
        (f) => f && isString((f as Partial<Folder>).id) && isString((f as Partial<Folder>).name),
      )
      .map((f) => {
        const folder = f as Partial<Folder>;
        return {
          id: folder.id as string,
          name: folder.name as string,
          color: (folder.color as string | undefined) ?? '#6b7280',
          icon: (folder.icon as string | undefined) ?? '📁',
          sortOrder:
            typeof folder.sortOrder === 'number' && Number.isFinite(folder.sortOrder)
              ? folder.sortOrder
              : 0,
          createdAt: isString(folder.createdAt) ? folder.createdAt : new Date().toISOString(),
        } satisfies Folder;
      });

    // Restore folders before importing records, so record.folderId associations remain valid.
    for (const folder of foldersToRestore) {
      await folderRepository.insert(folder);
      await folderRepository.update(folder.id, {
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        sortOrder: folder.sortOrder,
      });
    }

    // Refresh Zustand state/order.
    await useFolderStore.getState().load();
  }

  const records: VoiceRecord[] = [];

  for (const r of payload.records) {
    const record = normalizeRecord(r) as VoiceRecord & { audioPath?: string };
    const relativePath = record.audioPath;

    if (payload.version === 2 && relativePath && isRelativeAudioPath(relativePath)) {
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

  await removeDirRecursive(extractDir);

  return {
    success: true,
    records,
    exportedAt: payload.exportedAt,
  };
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

export const importData = async (): Promise<ImportResult> => {
  try {
    const [file] = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
      copyTo: 'cachesDirectory',
    });

    const uri =
      (file as { uri?: string; fileUri?: string }).fileUri ?? (file as { uri?: string }).uri;

    if (!uri) {
      return { success: false, error: i18n.t('importExport.fileNotSelected') };
    }

    const fileName = (file as { name?: string }).name ?? '';
    const isZip = await shouldTreatAsZipArchive(uri, fileName);

    if (isZip) {
      return importFromZip(uri);
    }

    const raw = await NitroFS.readFile(uri.startsWith('file://') ? uri.slice(7) : uri, 'utf8');
    const payload = JSON.parse(raw) as ExportPayload;

    if (
      (payload.version !== 1 && payload.version !== 2 && payload.version !== 3) ||
      !isArray(payload.records)
    ) {
      return { success: false, error: i18n.t('importExport.invalidFormat') };
    }

    if (payload.version === 3 && isArray(payload.folders)) {
      const foldersToRestore = payload.folders
        .filter(
          (f) => f && isString((f as Partial<Folder>).id) && isString((f as Partial<Folder>).name),
        )
        .map((f) => {
          const folder = f as Partial<Folder>;
          return {
            id: folder.id as string,
            name: folder.name as string,
            color: (folder.color as string | undefined) ?? '#6b7280',
            icon: (folder.icon as string | undefined) ?? '📁',
            sortOrder:
              typeof folder.sortOrder === 'number' && Number.isFinite(folder.sortOrder)
                ? folder.sortOrder
                : 0,
            createdAt: isString(folder.createdAt) ? folder.createdAt : new Date().toISOString(),
          } satisfies Folder;
        });

      for (const folder of foldersToRestore) {
        await folderRepository.insert(folder);
        await folderRepository.update(folder.id, {
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          sortOrder: folder.sortOrder,
        });
      }

      await useFolderStore.getState().load();
    }

    const records = payload.records.map((r) => {
      const record = normalizeRecord(r) as VoiceRecord;
      delete (record as { audioPath?: string }).audioPath;
      return record;
    });

    return { success: true, records, exportedAt: payload.exportedAt };
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'DOCUMENT_PICKER_CANCELED') {
      return { success: false, error: 'cancelled' };
    }

    return { success: false, error: i18n.t('importExport.readError') };
  }
};
