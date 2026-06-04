import { MenuView } from '@react-native-menu/menu';
import type { TFunction } from 'i18next';
import { FolderPlus, MoreVertical, Search, SquarePen } from 'lucide-react-native';
import React, { memo, useMemo } from 'react';
import { View } from 'react-native';

import type { BatchSelectState } from '@/features/batch-select';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { HeaderIconButton } from '@/shared/ui';

type InboxScreenHeaderRightProps = {
  color: Colors;
  isLoaded: boolean;
  batchSelect: BatchSelectState;
  recordsLength: number;
  searchBarExplicitOpen: boolean;
  query: string;
  showInboxSearchBar: boolean;
  allSelected: boolean;
  foldersEnabled: boolean;
  isAutoOrganizing: boolean;
  onSearchHeaderPress: () => void;
  onSelectAll: () => void;
  onAutoOrganize: () => void;
  onEnterBatchMode: () => void;
  onOpenAllTasks: () => void;
  onCreateTextNote: () => void;
  onImportFile: () => void;
  /** Tablet sidebar: no overflow menu; actions as header icons. */
  useTabletShell?: boolean;
  /** Tablet sidebar already exposes text note compose. */
  hideCreateTextNote?: boolean;
  t: TFunction;
};

const HEADER_ICON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

function InboxScreenHeaderRightInner({
  color,
  isLoaded,
  batchSelect,
  recordsLength,
  searchBarExplicitOpen,
  query,
  showInboxSearchBar,
  allSelected,
  foldersEnabled,
  isAutoOrganizing,
  onSearchHeaderPress,
  onSelectAll,
  onAutoOrganize,
  onEnterBatchMode,
  onOpenAllTasks,
  onCreateTextNote,
  onImportFile,
  useTabletShell = false,
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
    }> = [];

    if (!useTabletShell) {
      items.push({
        id: 'allTasks',
        title: t('allTasks.title'),
        titleColor: color.text.primary,
        image: 'checklist',
        imageColor: color.text.primary,
      });
    }

    if (foldersEnabled && !useTabletShell) {
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
    items.push({
      id: 'importFile',
      title: t('inbox.menuImportFile'),
      titleColor: color.text.primary,
      image: 'doc.badge.plus',
      imageColor: color.text.primary,
    });
    return items;
  }, [color.text.primary, foldersEnabled, isAutoOrganizing, t, useTabletShell]);

  if (!isLoaded) return null;

  if (batchSelect.isSelectMode) {
    return (
      <HeaderIconButton
        label={allSelected ? t('batch.deselectAll') : t('batch.selectAll')}
        color={color}
        onPress={onSelectAll}
      />
    );
  }

  const searchButton =
    recordsLength > 0 ? (
      <HeaderIconButton
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
        hitSlop={HEADER_ICON_HIT_SLOP}
      />
    ) : null;

  if (useTabletShell) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {searchButton}
        {foldersEnabled ? (
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            color={color}
            disabled={isAutoOrganizing}
            icon={
              <FolderPlus
                size={20}
                color={isAutoOrganizing ? color.text.muted : color.text.primary}
                strokeWidth={2.2}
              />
            }
            accessibilityLabel={t('inbox.menuAutoOrganize')}
            accessibilityState={{ disabled: isAutoOrganizing }}
            onPress={() => {
              if (isAutoOrganizing) return;
              onAutoOrganize();
            }}
            hitSlop={HEADER_ICON_HIT_SLOP}
          />
        ) : null}
        <MenuView
          key={`inbox-tablet-more-${theme}`}
          title=""
          themeVariant={isDark ? 'dark' : 'light'}
          shouldOpenOnLongPress={false}
          actions={moreMenuActions}
          onPressAction={({ nativeEvent }) => {
            const id = nativeEvent.event;
            if (id === 'selectNotes') onEnterBatchMode();
            if (id === 'importFile') onImportFile();
          }}
        >
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<MoreVertical size={20} color={color.text.primary} strokeWidth={2.2} />}
            color={color}
            onPress={() => {}}
            accessibilityLabel={t('common.moreActions')}
            hitSlop={HEADER_ICON_HIT_SLOP}
          />
        </MenuView>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {searchButton}
      {!hideCreateTextNote ? (
        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<SquarePen size={20} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onCreateTextNote}
          accessibilityLabel={t('textNote.openCreate')}
          hitSlop={HEADER_ICON_HIT_SLOP}
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
          if (id === 'importFile') onImportFile();
          if (id === 'allTasks') onOpenAllTasks();
          if (id === 'autoOrganize' && !isAutoOrganizing && foldersEnabled) onAutoOrganize();
          if (id === 'selectNotes') onEnterBatchMode();
        }}
      >
        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<MoreVertical size={20} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={() => {}}
          accessibilityLabel={t('common.moreActions')}
          hitSlop={HEADER_ICON_HIT_SLOP}
        />
      </MenuView>
    </View>
  );
}

export const InboxScreenHeaderRight = memo(InboxScreenHeaderRightInner);
