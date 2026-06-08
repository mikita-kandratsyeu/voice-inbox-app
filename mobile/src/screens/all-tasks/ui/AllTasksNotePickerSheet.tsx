import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Search, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Folder } from '@/entities/folder/model/types';
import type { RecordListItem } from '@/entities/record';
import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { AppBottomSheetModal, getInputFieldInputStyle, useBottomSheetContentPadding } from '@/shared/ui';

import { AllTasksNotePickerRow } from './AllTasksNotePickerRow';

const NOTE_PICKER_LIST_MAX_HEIGHT = 420;

type AllTasksNotePickerSheetProps = {
  visible: boolean;
  records: RecordListItem[];
  folders: Folder[];
  onClose: () => void;
  onSelect: (recordId: string) => void;
};

function normalizeSearchQuery(value: string): string {
  return value.trim().toLowerCase();
}

function recordMatchesQuery(record: RecordListItem, query: string): boolean {
  if (!query) return true;

  if (record.title.toLowerCase().includes(query)) return true;

  return (record.tags ?? []).some((tag) => tag.toLowerCase().includes(query));
}

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
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [records],
  );

  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);

  const filteredRecords = useMemo(
    () => sortedRecords.filter((record) => recordMatchesQuery(record, normalizedQuery)),
    [normalizedQuery, sortedRecords],
  );

  const handleClose = useCallback(() => {
    setQuery('');
    setFocused(false);
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item, index }: { item: RecordListItem; index: number }) => (
      <AllTasksNotePickerRow
        record={item}
        folder={item.folderId ? (folderById.get(item.folderId) ?? null) : null}
        color={color}
        isLast={index === filteredRecords.length - 1}
        onPress={() => onSelect(item.id)}
      />
    ),
    [color, filteredRecords.length, folderById, onSelect],
  );

  const keyExtractor = useCallback((item: RecordListItem) => item.id, []);

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose} snapPoints={['75%']}>
      <View style={{ flex: 1, paddingHorizontal: 20, ...contentPadding }}>
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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: color.background.tertiary,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: IS_IOS ? 10 : 8,
            borderWidth: 1,
            borderColor: focused ? color.accent.primary : color.border.default,
            marginBottom: 16,
          }}
        >
          <Search
            size={16}
            color={focused || query ? color.accent.primary : color.icon.muted}
            strokeWidth={2}
          />
          <BottomSheetTextInput
            style={[getInputFieldInputStyle(color), { flex: 1 }]}
            placeholder={t('allTasks.pickNoteSearchPlaceholder')}
            placeholderTextColor={color.text.secondary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
            >
              <X size={16} color={color.text.secondary} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>

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
        ) : filteredRecords.length === 0 ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 15,
              lineHeight: 22,
              paddingVertical: 24,
              textAlign: 'center',
            }}
          >
            {t('allTasks.pickNoteSearchEmpty')}
          </Text>
        ) : (
          <View
            style={{
              backgroundColor: color.background.card,
              borderColor: color.border.default,
              borderRadius: 12,
              borderWidth: 1,
              overflow: 'hidden',
              flex: 1,
              maxHeight: NOTE_PICKER_LIST_MAX_HEIGHT,
            }}
          >
            <FlashList
              data={filteredRecords}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>
    </AppBottomSheetModal>
  );
}
