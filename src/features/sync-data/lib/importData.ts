import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

import type { VoiceRecord } from '@/entities/record';

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
      return { success: false, error: 'Файл не выбран' };
    }

    const raw = await RNFS.readFile(file.uri, 'utf8');
    const payload = JSON.parse(raw) as ExportPayload;

    if (payload.version !== 1 || !Array.isArray(payload.records)) {
      return { success: false, error: 'Неверный формат файла' };
    }

    return { success: true, records: payload.records, exportedAt: payload.exportedAt };
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'DOCUMENT_PICKER_CANCELED') {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: 'Не удалось прочитать файл' };
  }
};
