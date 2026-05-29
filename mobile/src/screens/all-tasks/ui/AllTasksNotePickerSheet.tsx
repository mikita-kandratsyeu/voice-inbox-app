import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Folder } from '@/entities/folder/model/types';
import type { RecordListItem } from '@/entities/record';
import { useColors } from '@/shared/config';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

import { AllTasksNotePickerRow } from './AllTasksNotePickerRow';

type AllTasksNotePickerSheetProps = {
  visible: boolean;
  records: RecordListItem[];
  folders: Folder[];
  onClose: () => void;
  onSelect: (recordId: string) => void;
};

export function AllTasksNotePickerSheet({
  visible,
  records,
  folders,
  onClose,
  onSelect,
}: AllTasksNotePickerSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(20);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [records],
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          ...contentPadding,
        }}
      >
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 4,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('allTasks.pickNoteTitle')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          {t('allTasks.pickNoteSubtitle')}
        </Text>
        {sortedRecords.length === 0 ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 15,
              lineHeight: 22,
              paddingVertical: 24,
              textAlign: 'center',
            }}
          >
            {t('allTasks.pickNoteEmpty')}
          </Text>
        ) : (
          <View
            style={{
              backgroundColor: color.background.card,
              borderColor: color.border.default,
              borderRadius: 12,
              borderWidth: 1,
              overflow: 'hidden',
            }}
          >
            {sortedRecords.map((record, index) => (
              <AllTasksNotePickerRow
                key={record.id}
                record={record}
                folder={record.folderId ? (folderById.get(record.folderId) ?? null) : null}
                color={color}
                isLast={index === sortedRecords.length - 1}
                onPress={() => onSelect(record.id)}
              />
            ))}
          </View>
        )}
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  );
}
