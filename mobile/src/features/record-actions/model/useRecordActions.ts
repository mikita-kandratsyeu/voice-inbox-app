import { Alert } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { i18n } from '@/shared/lib';

type UseRecordActionsOptions = {
  onDeleted?: () => void;
};

export const useRecordActions = ({ onDeleted }: UseRecordActionsOptions = {}) => {
  const { deleteRecord } = useRecordStore();

  const promptDelete = (record: VoiceRecord) => {
    Alert.alert(
      i18n.t('recordActions.deleteTitle'),
      i18n.t('recordActions.deleteMessage', { title: record.title }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteRecord(record.id);
            onDeleted?.();
          },
        },
      ],
    );
  };

  return { promptDelete };
};
