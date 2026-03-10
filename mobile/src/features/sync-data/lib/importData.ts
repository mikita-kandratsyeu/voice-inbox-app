import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

import type { VoiceRecord } from '@/entities/record';
import { i18n } from '@/shared/lib';

type ExportPayload = {
  version: 1;
  exportedAt: string;
  records: VoiceRecord[];
};

type ImportResult =
  | { success: true; records: VoiceRecord[]; exportedAt: string }
  | { success: false; error: string };

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

    return { success: true, records: payload.records, exportedAt: payload.exportedAt };
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'DOCUMENT_PICKER_CANCELED') {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: i18n.t('importExport.readError') };
  }
};
