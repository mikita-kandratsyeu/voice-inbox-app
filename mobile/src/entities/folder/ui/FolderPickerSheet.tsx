import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Search, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useProEntitlement } from '@/features/pro-license';
import { useAppTheme, useColors } from '@/shared/config';
import {
  IS_IOS,
  matchesSearchQuery,
  normalizeSearchQuery,
  resolveFolderListTintHex,
} from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  getInputFieldInputStyle,
  SheetHeader,
} from '@/shared/ui';

import type { Folder } from '../model/types';
import { FolderPickerRow } from './FolderPickerRow';

const FOLDER_PICKER_LIST_MAX_HEIGHT = 420;
const FOLDER_PICKER_ROW_HEIGHT = 72;

type FolderPickerListItem = { kind: 'inbox' } | { kind: 'folder'; folder: Folder };

type FolderPickerSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  folders: Folder[];
  currentFolderId?: string | null;
  inboxLabel?: string;
  inboxSubtitle?: string;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
};

export const FolderPickerSheet = ({
  visible,
  title,
  subtitle,
  folders,
  currentFolderId,
  inboxLabel,
  inboxSubtitle,
  onClose,
  onSelect,
}: FolderPickerSheetProps) => {
  const showChecks = currentFolderId !== undefined;
  const { t } = useTranslation();
  const color = useColors();
  const scheme = useAppTheme();
  const { isProActive } = useProEntitlement();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [folders],
  );

  const resolvedInboxLabel = inboxLabel ?? t('folders.pickerInboxOnly');
  const resolvedInboxSubtitle = inboxSubtitle ?? t('tabs.inbox');
  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);

  const showInboxRow = useMemo(
    () =>
      !normalizedQuery ||
      matchesSearchQuery(resolvedInboxLabel, normalizedQuery) ||
      matchesSearchQuery(resolvedInboxSubtitle, normalizedQuery),
    [normalizedQuery, resolvedInboxLabel, resolvedInboxSubtitle],
  );

  const filteredFolders = useMemo(
    () => sortedFolders.filter((folder) => matchesSearchQuery(folder.name, normalizedQuery)),
    [normalizedQuery, sortedFolders],
  );

  const listItems = useMemo(() => {
    const items: FolderPickerListItem[] = [];
    if (showInboxRow) items.push({ kind: 'inbox' });
    for (const folder of filteredFolders) {
      items.push({ kind: 'folder', folder });
    }
    return items;
  }, [filteredFolders, showInboxRow]);

  const handleClose = useCallback(() => {
    setQuery('');
    setFocused(false);
    onClose();
  }, [onClose]);

  const pickInbox = useCallback(() => {
    onSelect(null);
    handleClose();
  }, [handleClose, onSelect]);

  const pickFolder = useCallback(
    (folderId: string) => {
      onSelect(folderId);
      handleClose();
    },
    [handleClose, onSelect],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FolderPickerListItem; index: number }) => {
      const isLast = index === listItems.length - 1;

      if (item.kind === 'inbox') {
        return (
          <FolderPickerRow
            label={resolvedInboxLabel}
            subtitle={resolvedInboxSubtitle}
            color={color}
            inbox
            selected={showChecks && currentFolderId == null}
            showSelectionCheck={showChecks}
            isLast={isLast}
            onPress={pickInbox}
          />
        );
      }

      const tintHex = resolveFolderListTintHex(item.folder.color, isProActive, scheme);
      const selected = showChecks && currentFolderId === item.folder.id;

      return (
        <FolderPickerRow
          label={item.folder.name}
          color={color}
          iconId={item.folder.icon}
          tintHex={tintHex}
          selected={selected}
          showSelectionCheck={showChecks}
          isLast={isLast}
          onPress={() => pickFolder(item.folder.id)}
        />
      );
    },
    [
      color,
      currentFolderId,
      isProActive,
      listItems.length,
      pickFolder,
      pickInbox,
      resolvedInboxLabel,
      resolvedInboxSubtitle,
      scheme,
      showChecks,
    ],
  );

  const keyExtractor = useCallback(
    (item: FolderPickerListItem) => (item.kind === 'inbox' ? 'inbox' : item.folder.id),
    [],
  );

  const listHeight = useMemo(
    () => Math.min(listItems.length * FOLDER_PICKER_ROW_HEIGHT, FOLDER_PICKER_LIST_MAX_HEIGHT),
    [listItems.length],
  );

  return (
    <AppBottomSheetModal visible={visible} onClose={handleClose}>
      <AppBottomSheetContent bottomPadding={12}>
        <SheetHeader title={title} subtitle={subtitle} color={color} marginBottom={10} />

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

        {listItems.length === 0 ? (
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
              data={listItems}
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
};
