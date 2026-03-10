import { Alert } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { i18n } from '@/shared/lib';

type UseRecordActionsOptions = {
  onDeleted?: () => void;
};

export const useRecordActions = ({ onDeleted }: UseRecordActionsOptions = {}) => {
  const { deleteRecord, renameRecord } = useRecordStore();

  const promptRename = (record: VoiceRecord) => {
    Alert.prompt(
      i18n.t('recordActions.renameTitle'),
      i18n.t('recordActions.renamePrompt'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.save'),
          onPress: async (newTitle?: string) => {
            const trimmed = newTitle?.trim();

            if (trimmed && trimmed !== record.title) {
              await renameRecord(record.id, trimmed);
            }
          },
        },
      ],
      'plain-text',
      record.title,
    );
  };

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

  return { promptRename, promptDelete };
};
