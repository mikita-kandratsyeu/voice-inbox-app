import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FileText } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { RecordListItem } from '@/entities/record';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

type AllTasksNotePickerSheetProps = {
  visible: boolean;
  records: RecordListItem[];
  onClose: () => void;
  onSelect: (recordId: string) => void;
};

export function AllTasksNotePickerSheet({
  visible,
  records,
  onClose,
  onSelect,
}: AllTasksNotePickerSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(20);

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
            marginBottom: 16,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('allTasks.pickNoteTitle')}
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
          sortedRecords.map((record) => (
            <Pressable
              key={record.id}
              onPress={() => {
                hapticSelection();
                onSelect(record.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={record.title}
              style={{
                alignItems: 'center',
                backgroundColor: color.background.tertiary,
                borderRadius: 12,
                flexDirection: 'row',
                gap: 12,
                marginBottom: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: color.background.secondary,
                  borderRadius: 10,
                  height: 40,
                  justifyContent: 'center',
                  width: 40,
                }}
              >
                <FileText size={20} color={color.accent.primary} strokeWidth={2} />
              </View>
              <Text
                style={{ color: color.text.primary, flex: 1, fontSize: 16, fontWeight: '500' }}
                numberOfLines={2}
              >
                {record.title}
              </Text>
            </Pressable>
          ))
        )}
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  );
}
