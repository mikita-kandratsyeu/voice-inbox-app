import dayjs from 'dayjs';
import DocumentPicker from 'react-native-document-picker';
import { unzip } from 'react-native-zip-archive';

import type { Folder } from '@/entities/folder';
import { useFolderStore } from '@/entities/folder';
import { DEFAULT_FOLDER_ICON_KEY } from '@/entities/folder/lib/folderLucideIcons';
import { folderRepository } from '@/entities/folder/model/repository';
import type { RecordClassification, VoiceRecord } from '@/entities/record';
import {
  DEFAULT_FOLDER_BRAND_HEX,
  ensureRecordingsDir,
  i18n,
  isArray,
  isNumber,
  isString,
  isStringArrayItem,
  RECORDINGS_DIR,
} from '@/shared/lib';
import { getCachesDirectoryPath, getReadableDocumentPickerFsPath, NitroFS } from '@/shared/lib/fs';

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
    if (__DEV__) {
      console.warn('[unlinkIfExists] failed to unlink', path);
    }
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

async function importFromZip(fileUri: string): Promise<ImportResult> {
  const timestamp = Date.now();
  const extractDir = `${getCachesDirectoryPath()}/import-extract-${timestamp}`;
  const zipPath = toFsPath(fileUri);

  try {
    await unzip(zipPath, extractDir);
  } catch {
    return { success: false, error: i18n.t('importExport.invalidFormat') };
  }

  try {
    const metadataPath = `${extractDir}/${METADATA_FILENAME}`;
    const metadataExists = await NitroFS.exists(metadataPath);

    if (!metadataExists) {
      return { success: false, error: i18n.t('importExport.invalidFormat') };
    }

    const raw = await readUtf8WithAllFallbacks(metadataPath);

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
            color: (folder.color as string | undefined) ?? DEFAULT_FOLDER_BRAND_HEX,
            icon: (folder.icon as string | undefined) ?? DEFAULT_FOLDER_ICON_KEY,
            sortOrder:
              isNumber(folder.sortOrder) && Number.isFinite(folder.sortOrder)
                ? folder.sortOrder
                : 0,
            createdAt: isString(folder.createdAt) ? folder.createdAt : dayjs().toISOString(),
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

    if (payload.version !== 3) {
      const legacyFolderIds = Array.from(
        new Set(
          payload.records
            .map((r) => (r as { folderId?: unknown }).folderId)
            .filter((v): v is string => isString(v) && v.trim().length > 0),
        ),
      );

      for (const [index, folderId] of legacyFolderIds.entries()) {
        const legacyFolder: Folder = {
          id: folderId,
          name: `Imported folder ${index + 1}`,
          color: DEFAULT_FOLDER_BRAND_HEX,
          icon: DEFAULT_FOLDER_ICON_KEY,
          sortOrder: index,
          createdAt: dayjs().toISOString(),
        };

        try {
          await folderRepository.insert(legacyFolder);
          await folderRepository.update(legacyFolder.id, {
            name: legacyFolder.name,
            color: legacyFolder.color,
            icon: legacyFolder.icon,
            sortOrder: legacyFolder.sortOrder,
          });
        } catch {
          if (__DEV__) {
            console.warn('[importFromZip] failed to insert legacy folder', legacyFolder);
          }
        }
      }

      await useFolderStore.getState().load();
    }

    const records: VoiceRecord[] = [];

    for (const r of payload.records) {
      const record = normalizeRecord(r) as VoiceRecord & { audioPath?: string };
      const relativePath = record.audioPath;

      if (
        (payload.version === 2 || payload.version === 3) &&
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

    return {
      success: true,
      records,
      exportedAt: payload.exportedAt,
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

export const importData = async (): Promise<ImportResult> => {
  let pickedFsPath: string | null = null;

  try {
    const [file] = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
      copyTo: 'cachesDirectory',
    });

    const fileLike = file as {
      uri?: string;
      fileUri?: string;
      fileCopyUri?: string;
      name?: string;
    };
    const fsPath = await getReadableDocumentPickerFsPath(fileLike);
    pickedFsPath = fsPath;
    const uri = fileLike.fileCopyUri ?? fileLike.fileUri ?? fileLike.uri;

    if (!uri || !fsPath) {
      if (__DEV__) {
        console.warn('[importData] picker path is not readable', {
          uri: fileLike.uri,
          fileUri: fileLike.fileUri,
          fileCopyUri: fileLike.fileCopyUri,
        });
      }
      return { success: false, error: i18n.t('importExport.fileNotSelected') };
    }

    const fileName = fileLike.name ?? '';
    const isZip = await shouldTreatAsZipArchive(uri, fileName);

    if (isZip) {
      return await importFromZip(fsPath);
    }

    const raw = await readTextWithFileSchemeFallback(fsPath, 'utf8');
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
            color: (folder.color as string | undefined) ?? DEFAULT_FOLDER_BRAND_HEX,
            icon: (folder.icon as string | undefined) ?? DEFAULT_FOLDER_ICON_KEY,
            sortOrder:
              isNumber(folder.sortOrder) && Number.isFinite(folder.sortOrder)
                ? folder.sortOrder
                : 0,
            createdAt: isString(folder.createdAt) ? folder.createdAt : dayjs().toISOString(),
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
    const code = (err as { code?: string })?.code;

    if (code === 'DOCUMENT_PICKER_CANCELED' || code === 'E_DOCUMENT_PICKER_CANCELED') {
      return { success: false, error: 'cancelled' };
    }

    return { success: false, error: i18n.t('importExport.readError') };
  } finally {
    if (pickedFsPath && isPathInsideDir(pickedFsPath, getCachesDirectoryPath())) {
      await unlinkIfExists(pickedFsPath);
    }
  }
};
