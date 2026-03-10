import { Alert } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

type UseRecordActionsOptions = {
  onDeleted?: () => void;
};

export const useRecordActions = ({ onDeleted }: UseRecordActionsOptions = {}) => {
  const { deleteRecord, renameRecord } = useRecordStore();

  const promptRename = (record: VoiceRecord) => {
    Alert.prompt(
      'Rename note',
      'Enter a new name for the note',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
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
      'Delete note',
      `Are you sure you want to delete "${record.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
