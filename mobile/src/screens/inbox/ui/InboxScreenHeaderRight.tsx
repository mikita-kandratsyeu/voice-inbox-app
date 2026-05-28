import { MenuView } from '@react-native-menu/menu';
import type { TFunction } from 'i18next';
import { MoreVertical, Search, SquarePen } from 'lucide-react-native';
import React, { memo, useMemo } from 'react';
import { View } from 'react-native';

import type { BatchSelectState } from '@/features/batch-select';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
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
  /** Tablet sidebar already exposes text note compose. */
  hideCreateTextNote?: boolean;
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
  hideCreateTextNote = false,
  t,
}: InboxScreenHeaderRightProps) {
  const theme = useAppTheme();
  const isDark = theme === 'dark';

  const moreMenuActions = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      titleColor: string;
      image?: string;
      imageColor?: string;
      attributes?: { disabled?: boolean };
    }> = [
      {
        id: 'allTasks',
        title: t('allTasks.title'),
        titleColor: color.text.primary,
        image: 'checklist',
        imageColor: color.text.primary,
      },
    ];
    if (!isPrivateMode) {
      items.push({
        id: 'autoOrganize',
        title: t('inbox.menuAutoOrganize'),
        titleColor: color.text.primary,
        image: 'folder.badge.plus',
        imageColor: color.text.primary,
        attributes: isAutoOrganizing ? { disabled: true } : undefined,
      });
    }
    items.push({
      id: 'selectNotes',
      title: t('inbox.menuSelectNotes'),
      titleColor: color.text.primary,
      image: 'checkmark.circle',
      imageColor: color.text.primary,
    });
    return items;
  }, [color.text.primary, isAutoOrganizing, isPrivateMode, t]);

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
      {!hideCreateTextNote ? (
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<SquarePen size={20} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onCreateTextNote}
          accessibilityLabel={t('textNote.openCreate')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
      ) : null}
      <MenuView
        key={`inbox-more-${theme}`}
        title=""
        themeVariant={isDark ? 'dark' : 'light'}
        shouldOpenOnLongPress={false}
        actions={moreMenuActions}
        onPressAction={({ nativeEvent }) => {
          const id = nativeEvent.event;
          if (id === 'allTasks') onOpenAllTasks();
          if (id === 'autoOrganize' && !isAutoOrganizing && !isPrivateMode) onAutoOrganize();
          if (id === 'selectNotes') onEnterBatchMode();
        }}
      >
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<MoreVertical size={20} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={() => {}}
          accessibilityLabel={t('common.moreActions')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
      </MenuView>
    </View>
  );
}

export const InboxScreenHeaderRight = memo(InboxScreenHeaderRightInner);
