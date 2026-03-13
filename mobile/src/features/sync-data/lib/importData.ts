import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

import type { RecordClassification, VoiceRecord } from '@/entities/record';
import { i18n } from '@/shared/lib';

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
    typeof base.classification === 'string' &&
    VALID_CLASSIFICATIONS.includes(base.classification as RecordClassification)
      ? (base.classification as RecordClassification)
      : undefined;

  const keyPhrases: string[] = Array.isArray(base.keyPhrases)
    ? base.keyPhrases.filter((x): x is string => typeof x === 'string')
    : [];

  const nextSteps: string[] = Array.isArray(base.nextSteps)
    ? base.nextSteps.filter((x): x is string => typeof x === 'string')
    : [];

  return {
    ...base,
    classification: classification ?? base.classification,
    keyPhrases: keyPhrases.length > 0 ? keyPhrases : (base.keyPhrases ?? []),
    nextSteps: nextSteps.length > 0 ? nextSteps : (base.nextSteps ?? []),
    translatedTranscript:
      typeof base.translatedTranscript === 'string' ? base.translatedTranscript : undefined,
    translationLanguage:
      typeof base.translationLanguage === 'string' ? base.translationLanguage : undefined,
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
