import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share } from 'react-native';
import RNFS from 'react-native-fs';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { buildShareText, RECORD_TEXT_EXPORT_EXTENSION } from '@/features/share-record';
import { hapticError, hapticSuccess } from '@/shared/lib';

type UseBatchRecordActionsParams = {
  onComplete: () => void;
};

export const useBatchRecordActions = ({ onComplete }: UseBatchRecordActionsParams) => {
  const { t } = useTranslation();
  const archiveRecord = useRecordStore((s) => s.archiveRecord);
  const unarchiveRecord = useRecordStore((s) => s.unarchiveRecord);
  const deleteRecord = useRecordStore((s) => s.deleteRecord);
  const setRecordFolder = useRecordStore((s) => s.setRecordFolder);

  const batchArchive = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => archiveRecord(id)));
      hapticSuccess();
      onComplete();
    },
    [archiveRecord, onComplete],
  );

  const batchUnarchive = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => unarchiveRecord(id)));
      hapticSuccess();
      onComplete();
    },
    [unarchiveRecord, onComplete],
  );

  const batchDelete = useCallback(
    (ids: string[]) => {
      Alert.alert(
        t('batch.deleteTitle', { count: ids.length }),
        t('batch.deleteConfirm', { count: ids.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              await Promise.all(ids.map((id) => deleteRecord(id)));
              hapticSuccess();
              onComplete();
            },
          },
        ],
      );
    },
    [t, deleteRecord, onComplete],
  );

  const batchExport = useCallback(
    async (records: VoiceRecord[]) => {
      if (records.length === 0) return;

      try {
        const lines = records.map((record) => buildShareText(record));

        const content = lines.join('\n\n---\n\n');
        const fileName = `voice-inbox-export-${Date.now()}.${RECORD_TEXT_EXPORT_EXTENSION}`;
        const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, content, 'utf8');

        await Share.share({
          url: `file://${filePath}`,
          title: fileName,
        });
        hapticSuccess();
      } catch (err) {
        hapticError();
        if (__DEV__) console.warn('[batchExport] failed:', err);
        Alert.alert(t('common.error'), t('batch.exportFailed'));
      }
    },
    [t],
  );

  const batchMoveToFolder = useCallback(
    async (ids: string[], folderId: string | null) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => setRecordFolder(id, folderId)));
      hapticSuccess();
      onComplete();
    },
    [setRecordFolder, onComplete],
  );

  return { batchArchive, batchUnarchive, batchDelete, batchExport, batchMoveToFolder };
};
