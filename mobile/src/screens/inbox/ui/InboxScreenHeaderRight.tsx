import type { TFunction } from 'i18next';
import { Folders, GalleryHorizontalEnd, Keyboard, ListTodo, Search } from 'lucide-react-native';
import React, { memo } from 'react';
import { View } from 'react-native';

import type { BatchSelectState } from '@/features/batch-select';
import type { Colors } from '@/shared/config';
import { Button } from '@/shared/ui';

type InboxScreenHeaderRightProps = {
  color: Colors;
  isLoaded: boolean;
  batchSelect: BatchSelectState;
  recordsLength: number;
  searchBarExplicitOpen: boolean;
  query: string;
  showInboxSearchBar: boolean;
  allSelected: boolean;
  isPrivateMode: boolean;
  isAutoOrganizing: boolean;
  onSearchHeaderPress: () => void;
  onSelectAll: () => void;
  onAutoOrganize: () => void;
  onEnterBatchMode: () => void;
  onOpenAllTasks: () => void;
  onCreateTextNote: () => void;
  t: TFunction;
};

function InboxScreenHeaderRightInner({
  color,
  isLoaded,
  batchSelect,
  recordsLength,
  searchBarExplicitOpen,
  query,
  showInboxSearchBar,
  allSelected,
  isPrivateMode,
  isAutoOrganizing,
  onSearchHeaderPress,
  onSelectAll,
  onAutoOrganize,
  onEnterBatchMode,
  onOpenAllTasks,
  onCreateTextNote,
  t,
}: InboxScreenHeaderRightProps) {
  if (!isLoaded) return null;

  if (batchSelect.isSelectMode) {
    return (
      <Button
        iconOnly={false}
        variant="icon"
        size="md"
        label={allSelected ? t('batch.deselectAll') : t('batch.selectAll')}
        color={color}
        onPress={onSelectAll}
      />
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {recordsLength > 0 && (
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={
            <Search
              size={21}
              color={
                searchBarExplicitOpen || query.trim().length > 0
                  ? color.accent.primary
                  : color.text.primary
              }
              strokeWidth={2.2}
            />
          }
          color={color}
          onPress={onSearchHeaderPress}
          accessibilityLabel={
            !showInboxSearchBar
              ? t('search.a11yOpen')
              : query.trim() === ''
                ? t('search.a11yHide')
                : t('search.a11yFocus')
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
      )}
      {!isPrivateMode && (
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<Folders size={20} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onAutoOrganize}
          accessibilityLabel={t('folders.autoOrganizeButton')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          loading={isAutoOrganizing}
          disabled={isAutoOrganizing}
        />
      )}
      <Button
        iconOnly
        variant="icon"
        size="md"
        icon={<GalleryHorizontalEnd size={21} color={color.text.primary} strokeWidth={2.3} />}
        color={color}
        onPress={onEnterBatchMode}
        accessibilityLabel={t('batch.a11yEnterSelectMode')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      />
      <Button
        iconOnly
        variant="icon"
        size="md"
        icon={<Keyboard size={20} color={color.text.primary} strokeWidth={2.2} />}
        color={color}
        onPress={onCreateTextNote}
        accessibilityLabel={t('textNote.openCreate')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      />
      <Button
        iconOnly
        variant="icon"
        size="md"
        icon={<ListTodo size={22} color={color.text.primary} strokeWidth={2.2} />}
        color={color}
        onPress={onOpenAllTasks}
        accessibilityLabel={t('allTasks.a11yOpenAllTasks')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      />
    </View>
  );
}

export const InboxScreenHeaderRight = memo(InboxScreenHeaderRightInner);
