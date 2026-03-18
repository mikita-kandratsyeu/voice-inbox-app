import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

import type { RecordClassification, VoiceRecord } from '@/entities/record';
import {
  ensureRecordingsDir,
  i18n,
  isString,
  isStringArrayItem,
  RECORDINGS_DIR,
} from '@/shared/lib';

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

type ExportPayload = ExportPayloadV1 | ExportPayloadV2;

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

  const keyPhrases: string[] = Array.isArray(base.keyPhrases)
    ? base.keyPhrases.filter(isStringArrayItem)
    : [];

  const nextSteps: string[] = Array.isArray(base.nextSteps)
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

async function copyAudioFromExtractToApp(
  extractDir: string,
  relativeAudioPath: string,
  recordId: string,
): Promise<string | undefined> {
  const fullPath = `${extractDir}/${relativeAudioPath}`.replace(/\/+/g, '/');
  const normalized = fullPath.startsWith('file://') ? fullPath.slice(7) : fullPath;
  const exists = await RNFS.exists(normalized);

  if (!exists) {
    return undefined;
  }

  await ensureRecordingsDir();

  const ext = normalized.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
  const destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;

  try {
    await RNFS.copyFile(normalized, destPath);

    return destPath;
  } catch {
    return undefined;
  }
}

async function importFromZip(fileUri: string): Promise<ImportResult> {
  const timestamp = Date.now();
  const extractDir = `${RNFS.CachesDirectoryPath}/import-extract-${timestamp}`;
  const zipPath = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;

  try {
    await unzip(zipPath, extractDir);
  } catch {
    return { success: false, error: i18n.t('importExport.invalidFormat') };
  }

  const metadataPath = `${extractDir}/${METADATA_FILENAME}`;
  const metadataExists = await RNFS.exists(metadataPath);

  if (!metadataExists) {
    await removeDirRecursive(extractDir);
    return { success: false, error: i18n.t('importExport.invalidFormat') };
  }

  const raw = await RNFS.readFile(metadataPath, 'utf8');
  const payload = JSON.parse(raw) as ExportPayload;

  if ((payload.version !== 1 && payload.version !== 2) || !Array.isArray(payload.records)) {
    await removeDirRecursive(extractDir);

    return { success: false, error: i18n.t('importExport.invalidFormat') };
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
  const items = await RNFS.readDir(path);
  for (const item of items) {
    if (item.isFile()) {
      await RNFS.unlink(item.path);
    } else {
      await removeDirRecursive(item.path);
    }
  }
  await RNFS.unlink(path);
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
    const isZip = fileName.toLowerCase().endsWith('.zip');

    if (isZip) {
      return importFromZip(uri);
    }

    const raw = await RNFS.readFile(uri, 'utf8');
    const payload = JSON.parse(raw) as ExportPayload;

    if ((payload.version !== 1 && payload.version !== 2) || !Array.isArray(payload.records)) {
      return { success: false, error: i18n.t('importExport.invalidFormat') };
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
