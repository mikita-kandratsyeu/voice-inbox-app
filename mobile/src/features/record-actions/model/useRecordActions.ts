import { Alert } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { i18n } from '@/shared/lib';

type UseRecordActionsOptions = {
  onDeleted?: () => void;
};

export const useRecordActions = ({ onDeleted }: UseRecordActionsOptions = {}) => {
  const moveRecordToTrash = useRecordStore((s) => s.moveRecordToTrash);

  const promptDelete = (record: VoiceRecord) => {
    Alert.alert(
      i18n.t('recordActions.moveToTrashTitle'),
      i18n.t('recordActions.moveToTrashMessage', { title: record.title }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('recordActions.moveToTrashConfirm'),
          style: 'destructive',
          onPress: async () => {
            await moveRecordToTrash(record.id);
            onDeleted?.();
          },
        },
      ],
    );
  };

  return { promptDelete };
};
