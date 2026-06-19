import { MenuView } from '@react-native-menu/menu';
import type { TFunction } from 'i18next';
import { FolderTree, ListChecks, MoreVertical, Search } from 'lucide-react-native';
import React, { memo, useMemo } from 'react';

import type { BatchSelectState } from '@/features/batch-select';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';
import { FrostedChromeSurface, FrostedHeaderButtonGroup, HeaderIconButton } from '@/shared/ui';

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
  onOpenAiOrganizeSheet: () => void;
  onEnterBatchMode: () => void;
  onOpenAllTasks: () => void;
  onOpenNotesGraph: () => void;
  onImportFile: () => void;
  /** Tablet sidebar: no overflow menu; actions as header icons. */
  useTabletShell?: boolean;
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
  onOpenAiOrganizeSheet,
  onEnterBatchMode,
  onOpenAllTasks,
  onOpenNotesGraph,
  onImportFile,
  useTabletShell = false,
  t,
}: InboxScreenHeaderRightProps) {
  const theme = useAppTheme();
  const isDark = theme === 'dark';

  const organizeDisabled = isAutoOrganizing;

  const moreMenuActions = useMemo(() => {
    const titleColor = color.text.primary;
    const actions: NativeMenuAction[] = [];

    const navigationItems: NativeMenuAction[] = [];

    if (foldersEnabled && !useTabletShell) {
      navigationItems.push({
        id: 'autoOrganize',
        title: t('inbox.menuAutoOrganize'),
        titleColor,
        image: 'folder.badge.plus',
        imageColor: titleColor,
        attributes: isAutoOrganizing ? { disabled: true } : undefined,
      });
    }

    if (!useTabletShell) {
      navigationItems.push({
        id: 'notesGraph',
        title: t('notesGraph.title'),
        titleColor,
        image: 'point.3.connected.trianglepath.dotted',
        imageColor: titleColor,
      });
    }

    navigationItems.push({
      id: 'importFile',
      title: t('inbox.menuImportFile'),
      titleColor,
      image: 'doc.badge.plus',
      imageColor: titleColor,
    });

    if (navigationItems.length > 0) {
      if (!useTabletShell) {
        actions.push(inlineNativeMenuSection('navigationSection', titleColor, navigationItems));
      } else {
        actions.push(...navigationItems);
      }
    }

    const selectNotesAction: NativeMenuAction = {
      id: 'selectNotes',
      title: t('inbox.menuSelectNotes'),
      titleColor,
      image: 'checkmark.circle',
      imageColor: titleColor,
    };

    if (!useTabletShell) {
      actions.push(inlineNativeMenuSection('selectNotesSection', titleColor, [selectNotesAction]));
    } else {
      actions.push(selectNotesAction);
    }

    return actions;
  }, [color.text.primary, foldersEnabled, isAutoOrganizing, t, useTabletShell]);

  if (!isLoaded) return null;

  if (batchSelect.isSelectMode) {
    return (
      <FrostedChromeSurface color={color} borderRadius={9999} shadow="subtle">
        <HeaderIconButton
          label={allSelected ? t('batch.deselectAll') : t('batch.selectAll')}
          color={color}
          onPress={onSelectAll}
          containerStyle={{ backgroundColor: 'transparent' }}
        />
      </FrostedChromeSurface>
    );
  }

  const searchButton =
    recordsLength > 0 ? (
      <HeaderIconButton
        inFrostedGroup
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

  const tabletOrganizeButton =
    useTabletShell && foldersEnabled ? (
      <HeaderIconButton
        inFrostedGroup
        iconOnly
        variant="icon"
        size="md"
        color={color}
        disabled={organizeDisabled}
        icon={
          <FolderTree
            size={20}
            color={organizeDisabled ? color.text.muted : color.text.primary}
            strokeWidth={2.2}
          />
        }
        accessibilityLabel={t('inbox.menuAutoOrganize')}
        accessibilityState={{ disabled: organizeDisabled }}
        onPress={() => {
          if (organizeDisabled) return;
          onOpenAiOrganizeSheet();
        }}
        hitSlop={HEADER_ICON_HIT_SLOP}
      />
    ) : null;

  if (useTabletShell) {
    return (
      <FrostedHeaderButtonGroup color={color}>
        {searchButton}
        {tabletOrganizeButton}
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
            inFrostedGroup
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
      </FrostedHeaderButtonGroup>
    );
  }

  return (
    <FrostedHeaderButtonGroup color={color}>
      {searchButton}
      <HeaderIconButton
        inFrostedGroup
        iconOnly
        variant="icon"
        size="md"
        icon={<ListChecks size={20} color={color.text.primary} strokeWidth={2.2} />}
        color={color}
        onPress={onOpenAllTasks}
        accessibilityLabel={t('allTasks.title')}
        hitSlop={HEADER_ICON_HIT_SLOP}
      />
      <MenuView
        key={`inbox-more-${theme}`}
        title=""
        themeVariant={isDark ? 'dark' : 'light'}
        shouldOpenOnLongPress={false}
        actions={moreMenuActions}
        onPressAction={({ nativeEvent }) => {
          const id = nativeEvent.event;
          if (id === 'importFile') onImportFile();
          if (id === 'notesGraph') onOpenNotesGraph();
          if (id === 'autoOrganize' && !isAutoOrganizing && foldersEnabled) {
            onOpenAiOrganizeSheet();
          }
          if (id === 'selectNotes') onEnterBatchMode();
        }}
      >
        <HeaderIconButton
          inFrostedGroup
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
    </FrostedHeaderButtonGroup>
  );
}

export const InboxScreenHeaderRight = memo(InboxScreenHeaderRightInner);
