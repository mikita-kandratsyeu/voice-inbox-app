import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Search, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Folder } from '@/entities/folder/model/types';
import type { RecordListItem } from '@/entities/record';
import { useColors } from '@/shared/config';
import { IS_IOS, normalizeSearchQuery } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  getInputFieldInputStyle,
  SheetHeader,
} from '@/shared/ui';

import { AllTasksNotePickerRow } from './AllTasksNotePickerRow';

const NOTE_PICKER_LIST_MAX_HEIGHT = 420;
const NOTE_PICKER_ROW_HEIGHT = 72;

type AllTasksNotePickerSheetProps = {
  visible: boolean;
  records: RecordListItem[];
  folders: Folder[];
  onClose: () => void;
  onSelect: (recordId: string) => void;
  titleKey?: string;
  subtitleKey?: string;
  searchPlaceholderKey?: string;
  emptyKey?: string;
  searchEmptyKey?: string;
};

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
  titleKey = 'allTasks.pickNoteTitle',
  subtitleKey = 'allTasks.pickNoteSubtitle',
  searchPlaceholderKey = 'allTasks.pickNoteSearchPlaceholder',
  emptyKey = 'allTasks.pickNoteEmpty',
  searchEmptyKey = 'allTasks.pickNoteSearchEmpty',
}: AllTasksNotePickerSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
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

  const listHeight = useMemo(
    () => Math.min(filteredRecords.length * NOTE_PICKER_ROW_HEIGHT, NOTE_PICKER_LIST_MAX_HEIGHT),
    [filteredRecords.length],
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      <AppBottomSheetContent bottomPadding={12}>
        <SheetHeader
          title={t(titleKey)}
          subtitle={t(subtitleKey)}
          color={color}
          marginBottom={10}
        />

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
            marginBottom: 10,
          }}
        >
          <Search
            size={16}
            color={focused || query ? color.accent.primary : color.icon.muted}
            strokeWidth={2}
          />
          <BottomSheetTextInput
            style={[getInputFieldInputStyle(color), { flex: 1 }]}
            placeholder={t(searchPlaceholderKey)}
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
            {t(emptyKey)}
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
            {t(searchEmptyKey)}
          </Text>
        ) : (
          <View
            style={{
              backgroundColor: color.background.card,
              borderColor: color.border.default,
              borderRadius: 12,
              borderWidth: 1,
              overflow: 'hidden',
              height: listHeight,
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
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
