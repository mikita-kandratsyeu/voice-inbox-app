import { types } from '@react-native-documents/picker';
import dayjs from 'dayjs';
import { isPasswordProtected, unzip, unzipWithPassword } from 'react-native-zip-archive';
import { z } from 'zod';

import type { Folder } from '@/entities/folder';
import { useFolderStore } from '@/entities/folder';
import { DEFAULT_FOLDER_ICON_KEY } from '@/entities/folder/lib/folderLucideIcons';
import { folderRepository } from '@/entities/folder/model/repository';
import type { RecordClassification, RecordingMark, VoiceRecord } from '@/entities/record';
import { sanitizeRecordingMark } from '@/entities/record';
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
import {
  getCachesDirectoryPath,
  getReadableDocumentPickerFsPath,
  NitroFS,
  pickSingleFileToCachesDirectory,
} from '@/shared/lib/fs';

const METADATA_FILENAME = 'metadata.json';

const MAX_STRING_LENGTH = 100_000;
const MAX_ARRAY_LENGTH = 10_000;
const MAX_RECORDS_COUNT = 50_000;
const MAX_FOLDERS_COUNT = 1_000;

const safeString = z.string().max(MAX_STRING_LENGTH);
const safeOptionalString = safeString.optional().nullable();

const RecordClassificationSchema = z.enum(['personal', 'work', 'meeting', 'idea', 'other']);

const VoiceRecordSchema = z.looseObject({
  id: safeString,
  createdAt: safeString,
  updatedAt: safeOptionalString,
  title: safeOptionalString,
  transcript: safeOptionalString,
  translatedTranscript: safeOptionalString,
  translationLanguage: safeOptionalString,
  summary: safeOptionalString,
  classification: RecordClassificationSchema.optional().nullable(),
  keyPhrases: z.array(safeString).max(MAX_ARRAY_LENGTH).optional().nullable(),
  nextSteps: z.array(safeString).max(MAX_ARRAY_LENGTH).optional().nullable(),
  meetingDialogue: safeOptionalString,
  folderId: safeOptionalString,
  audioPath: safeOptionalString,
  duration: z
    .union([z.string().max(MAX_STRING_LENGTH), z.number()])
    .optional()
    .nullable(),
  isRead: z.boolean().optional().nullable(),
  isPinned: z.boolean().optional().nullable(),
  language: safeOptionalString,
  audioSize: z.nullish(z.number().min(0)),
  recordingMarks: z
    .array(
      z.object({
        id: safeString,
        offsetMs: z.number().finite(),
        kind: z.enum(['moment', 'important', 'task', 'quote']).optional(),
        label: safeString.optional(),
      }),
    )
    .max(500)
    .optional()
    .nullable(),
});

function normalizeRecordingMarks(raw: unknown): RecordingMark[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const out: RecordingMark[] = [];
  for (let i = 0; i < raw.length; i++) {
    const mark = sanitizeRecordingMark(raw[i], i);
    if (mark) out.push(mark);
  }
  return out.length > 0 ? out : undefined;
}

const FolderSchema = z.looseObject({
  id: safeString,
  name: safeString,
  color: safeOptionalString,
  icon: safeOptionalString,
  sortOrder: z.nullish(z.number()),
  createdAt: safeOptionalString,
});

const BasePayloadSchema = z.object({
  exportedAt: safeString,
});

const ExportPayloadV1Schema = BasePayloadSchema.extend({
  version: z.literal(1),
  records: z.array(VoiceRecordSchema).max(MAX_RECORDS_COUNT),
});

const ExportPayloadV2Schema = BasePayloadSchema.extend({
  version: z.literal(2),
  records: z.array(VoiceRecordSchema).max(MAX_RECORDS_COUNT),
});

const ExportPayloadV3Schema = BasePayloadSchema.extend({
  version: z.literal(3),
  folders: z.array(FolderSchema).max(MAX_FOLDERS_COUNT).optional(),
  records: z.array(VoiceRecordSchema).max(MAX_RECORDS_COUNT),
});

const ExportPayloadSchema = z.discriminatedUnion('version', [
  ExportPayloadV1Schema,
  ExportPayloadV2Schema,
  ExportPayloadV3Schema,
]);

type ExportPayload = z.infer<typeof ExportPayloadSchema>;

/** Machine-readable import error for UI branching (not shown to users). */
export const IMPORT_ERROR_WRONG_BACKUP_PASSWORD = '__wrong_backup_password__' as const;

export type ImportDataOptions = {
  password?: string;
  /** Retry import after user enters password (file already in app cache). */
  zipFsPath?: string;
};

export type ImportResult =
  | { success: true; records: VoiceRecord[]; exportedAt: string }
  | { success: false; error: 'cancelled' | string }
  | { success: false; needsPassword: true; zipFsPath: string };

const VALID_CLASSIFICATIONS: RecordClassification[] = [
  'personal',
  'work',
  'meeting',
  'idea',
  'other',
];

function parseExportPayload(raw: unknown): ExportPayload | null {
  const result = ExportPayloadSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function normalizeDurationField(value: unknown): string {
  if (value === null || value === undefined) {
    return '0:00';
  }

  if (isString(value)) {
    return value;
  }

  if (isNumber(value) && Number.isFinite(value)) {
    const totalSec = Math.max(0, Math.floor(value));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;

    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return '0:00';
}

const MAX_MEETING_DIALOGUE_IMPORT_CHARS = 12_000;

function normalizeMeetingDialogueImport(raw: unknown): string | undefined {
  if (!isString(raw)) return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  return t.length > MAX_MEETING_DIALOGUE_IMPORT_CHARS
    ? t.slice(0, MAX_MEETING_DIALOGUE_IMPORT_CHARS)
    : t;
}

function normalizeRecord(raw: z.infer<typeof VoiceRecordSchema>): VoiceRecord {
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
    duration: normalizeDurationField(base.duration),
    classification: classification ?? base.classification,
    keyPhrases: keyPhrases.length > 0 ? keyPhrases : (base.keyPhrases ?? []),
    nextSteps: nextSteps.length > 0 ? nextSteps : (base.nextSteps ?? []),
    meetingDialogue: normalizeMeetingDialogueImport(base.meetingDialogue),
    translatedTranscript: isString(base.translatedTranscript)
      ? base.translatedTranscript
      : undefined,
    translationLanguage: isString(base.translationLanguage) ? base.translationLanguage : undefined,
    recordingMarks: normalizeRecordingMarks(base.recordingMarks),
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

    if (payload.version === 3 && Array.isArray(payload.folders)) {
      const foldersToRestore = payload.folders
        .filter((f) => isString(f.id) && isString(f.name))
        .map((f) => ({
          id: f.id,
          name: f.name,
          color: isString(f.color) ? f.color : DEFAULT_FOLDER_BRAND_HEX,
          icon: isString(f.icon) ? f.icon : DEFAULT_FOLDER_ICON_KEY,
          sortOrder: isNumber(f.sortOrder) && Number.isFinite(f.sortOrder) ? f.sortOrder : 0,
          createdAt: isString(f.createdAt) ? f.createdAt : dayjs().toISOString(),
        })) satisfies Folder[];

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
            .map((r) => r.folderId)
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
        if (__DEV__) {
          console.warn('[importData] pick/copy failed', picked.message);
        }
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
        if (__DEV__) {
          console.warn('[importData] picker path is not readable', {
            uri: fileLike.uri,
            fileUri: fileLike.fileUri,
            fileCopyUri: fileLike.fileCopyUri,
          });
        }
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

    if (payload.version === 3 && Array.isArray(payload.folders)) {
      const foldersToRestore = payload.folders
        .filter((f) => isString(f.id) && isString(f.name))
        .map((f) => ({
          id: f.id,
          name: f.name,
          color: isString(f.color) ? f.color : DEFAULT_FOLDER_BRAND_HEX,
          icon: isString(f.icon) ? f.icon : DEFAULT_FOLDER_ICON_KEY,
          sortOrder: isNumber(f.sortOrder) && Number.isFinite(f.sortOrder) ? f.sortOrder : 0,
          createdAt: isString(f.createdAt) ? f.createdAt : dayjs().toISOString(),
        })) satisfies Folder[];

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
