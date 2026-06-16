import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { type Folder } from '@/entities/folder';
import { FolderPickerRow } from '@/entities/folder/ui/FolderPickerRow';
import { useProEntitlement } from '@/features/pro-license';
import { useAppTheme, useColors } from '@/shared/config';
import {
  hapticSelection,
  IS_IOS,
  matchesSearchQuery,
  normalizeSearchQuery,
  resolveFolderListTintHex,
} from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  getInputFieldInputStyle,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

const FOLDER_PICKER_LIST_MAX_HEIGHT = 420;
const FOLDER_PICKER_ROW_HEIGHT = 72;

type GraphFolderPickerSheetProps = {
  visible: boolean;
  title: string;
  folders: Folder[];
  selectedFolderIds: string[];
  onClose: () => void;
  onApply: (folderIds: string[]) => void;
};

export function GraphFolderPickerSheet({
  visible,
  title,
  folders,
  selectedFolderIds,
  onClose,
  onApply,
}: GraphFolderPickerSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const scheme = useAppTheme();
  const { isProActive } = useProEntitlement();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [draftFolderIds, setDraftFolderIds] = useState<string[]>(selectedFolderIds);

  useEffect(() => {
    if (!visible) return;
    setDraftFolderIds(selectedFolderIds);
    setQuery('');
    setFocused(false);
  }, [selectedFolderIds, visible]);

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [folders],
  );

  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);

  const filteredFolders = useMemo(
    () => sortedFolders.filter((folder) => matchesSearchQuery(folder.name, normalizedQuery)),
    [normalizedQuery, sortedFolders],
  );

  const selectedSet = useMemo(() => new Set(draftFolderIds), [draftFolderIds]);

  const handleClose = useCallback(() => {
    setQuery('');
    setFocused(false);
    onClose();
  }, [onClose]);

  const toggleFolder = useCallback((folderId: string) => {
    setDraftFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId],
    );
  }, []);

  const handleApply = useCallback(() => {
    onApply(draftFolderIds);
    handleClose();
  }, [draftFolderIds, handleClose, onApply]);

  const handleClear = useCallback(() => {
    setDraftFolderIds([]);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Folder; index: number }) => {
      const tintHex = resolveFolderListTintHex(item.color, isProActive, scheme);
      const selected = selectedSet.has(item.id);

      return (
        <FolderPickerRow
          label={item.name}
          color={color}
          iconId={item.icon}
          tintHex={tintHex}
          selected={selected}
          showSelectionCheck
          isLast={index === filteredFolders.length - 1}
          onPress={() => {
            hapticSelection();
            toggleFolder(item.id);
          }}
        />
      );
    },
    [color, filteredFolders.length, isProActive, scheme, selectedSet, toggleFolder],
  );

  const listHeight = useMemo(
    () =>
      Math.min(filteredFolders.length * FOLDER_PICKER_ROW_HEIGHT, FOLDER_PICKER_LIST_MAX_HEIGHT),
    [filteredFolders.length],
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      <AppBottomSheetContent bottomPadding={12}>
        <SheetHeader title={title} color={color} marginBottom={10} />

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
            placeholder={t('folders.pickerSearchPlaceholder')}
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

        {filteredFolders.length === 0 ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 15,
              lineHeight: 22,
              paddingVertical: 24,
              textAlign: 'center',
            }}
          >
            {t('folders.pickerSearchEmpty')}
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
              data={filteredFolders}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        <SheetFooterButtons
          color={color}
          primaryLabel={t('common.done')}
          onPrimaryPress={handleApply}
          secondaryLabel={t('common.clear')}
          onSecondaryPress={handleClear}
          secondaryDisabled={draftFolderIds.length === 0}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
