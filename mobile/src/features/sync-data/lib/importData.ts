import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

import type { RecordClassification, VoiceRecord } from '@/entities/record';
import { i18n, isString, isStringArrayItem } from '@/shared/lib';

type ExportPayload = {
  version: 1;
  exportedAt: string;
  records: VoiceRecord[];
};

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

export const importData = async (): Promise<ImportResult> => {
  try {
    const [file] = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
    });

    if (!file.uri) {
      return { success: false, error: i18n.t('importExport.fileNotSelected') };
    }

    const raw = await RNFS.readFile(file.uri, 'utf8');
    const payload = JSON.parse(raw) as ExportPayload;

    if (payload.version !== 1 || !Array.isArray(payload.records)) {
      return { success: false, error: i18n.t('importExport.invalidFormat') };
    }

    const records = payload.records.map(normalizeRecord);

    return { success: true, records, exportedAt: payload.exportedAt };
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'DOCUMENT_PICKER_CANCELED') {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: i18n.t('importExport.readError') };
  }
};
