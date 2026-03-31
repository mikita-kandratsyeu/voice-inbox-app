import { useNavigation } from '@react-navigation/native';
import type { FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutAnimation, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useFolderStore } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAutoArchiveReadNotes } from '@/features/auto-archive';
import { useBatchRecordActions, useBatchSelect } from '@/features/batch-select';
import { useInboxFiltersReset } from '@/features/inbox-filters';
import { useAutoOrganizeFolders, useManageFolders } from '@/features/manage-folders';
import { useProEntitlement } from '@/features/pro-license';
import { useSearchRecords } from '@/features/search-records';
import { useColors } from '@/shared/config';
import { useIsTablet, useScrollToTopOnTabPress, useTabletContentMaxWidth } from '@/shared/lib';
import { getHasSeenSwipeHint, setHasSeenSwipeHint } from '@/shared/lib/hintsStorage';

import { InboxScreenListItem } from '../ui/InboxScreenListItem';
import {
  type FlattenedItem,
  INBOX_RECORD_PAGE_SIZE,
  type InboxNavigationProp,
} from './inboxScreenTypes';
import { countFlattenedRecords, trimFlattenedInboxItems } from './trimFlattenedInboxItems';

export function useInboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const color = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const contentMaxWidth = useTabletContentMaxWidth();
  const navigation = useNavigation<InboxNavigationProp>();
  const { records, isLoaded, archiveRecord, unarchiveRecord, togglePin } = useRecordStore(
    useShallow((s) => ({
      records: s.records,
      isLoaded: s.isLoaded,
      archiveRecord: s.archiveRecord,
      unarchiveRecord: s.unarchiveRecord,
      togglePin: s.togglePin,
    })),
  );

  const { folders, activeFolderId, setActiveFolder } = useFolderStore(
    useShallow((s) => ({
      folders: s.folders,
      activeFolderId: s.activeFolderId,
      setActiveFolder: s.setActiveFolder,
    })),
  );
  const { isProActive } = useProEntitlement();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const isPrivateMode = aiExecutionMode === 'private_experimental';

  useAutoArchiveReadNotes();

  const {
    modalVisible: folderModalVisible,
    editingFolder,
    openCreateModal: openCreateFolderModal,
    openEditModal: openEditFolderModal,
    closeModal: closeFolderModal,
    handleSave: handleFolderSave,
    handleDelete: handleFolderDelete,
  } = useManageFolders();
  const {
    runAutoOrganize,
    isRunning: isAutoOrganizing,
    overlayVisible: autoOrganizeOverlayVisible,
    overlayMode: autoOrganizeOverlayMode,
  } = useAutoOrganizeFolders(records, {
    onResult: (result) => {
      navigation.navigate('AutoOrganizeReview', { result });
    },
  });

  const effectiveActiveFolderId = isPrivateMode ? null : activeFolderId;

  const folderFilteredRecords = useMemo(() => {
    if (!effectiveActiveFolderId) return records;
    return records.filter((r) => r.folderId === effectiveActiveFolderId);
  }, [records, effectiveActiveFolderId]);

  const folderColorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of folders) {
      m.set(f.id, f.color);
    }
    return m;
  }, [folders]);

  const {
    query,
    setQuery,
    debouncedQuery,
    flattenedData,
    filtered,
    subtitleText,
    isSearching,
    filterStatus,
    setFilterStatus,
    menuFilterStatus,
    setMenuFilterStatus,
    sortOption,
    setSortOption,
    resetToDefault,
  } = useSearchRecords(folderFilteredRecords);

  const totalFlattenedRecords = useMemo(
    () => countFlattenedRecords(flattenedData),
    [flattenedData],
  );

  const [visibleRecordCount, setVisibleRecordCount] = useState(INBOX_RECORD_PAGE_SIZE);

  useEffect(() => {
    setVisibleRecordCount(INBOX_RECORD_PAGE_SIZE);
  }, [filterStatus, sortOption, debouncedQuery]);

  const pagedFlattenedData = useMemo(
    () => trimFlattenedInboxItems(flattenedData, visibleRecordCount),
    [flattenedData, visibleRecordCount],
  );

  const canLoadMoreInbox = totalFlattenedRecords > visibleRecordCount;

  const listRef = useRef<FlashListRef<FlattenedItem>>(null);
  const folderChipScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const inboxFiltersReset = useInboxFiltersReset();
  const [showSwipeHint, setShowSwipeHint] = useState(() => !getHasSeenSwipeHint());

  const dismissSwipeHint = useCallback(() => {
    setHasSeenSwipeHint();
    setShowSwipeHint(false);
  }, []);

  const batchSelect = useBatchSelect();

  const [searchBarExplicitOpen, setSearchBarExplicitOpen] = useState(false);
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);

  const showInboxSearchBar =
    records.length > 0 &&
    !batchSelect.isSelectMode &&
    (searchBarExplicitOpen || query.trim().length > 0);

  const emptyStatePlacement: 'center' | 'top' = showInboxSearchBar ? 'top' : 'center';

  const handleSearchHeaderPress = useCallback(() => {
    const barVisible = searchBarExplicitOpen || query.trim().length > 0;
    if (barVisible && query.trim() === '') {
      setSearchBarExplicitOpen(false);
    } else {
      setSearchBarExplicitOpen(true);
      setSearchFocusSignal((n) => n + 1);
    }
  }, [searchBarExplicitOpen, query]);

  const handleCreateTextNote = useCallback(() => {
    navigation.navigate('TextNoteModal');
  }, [navigation]);

  const enterBatchMode = useCallback(
    (initialId?: string, options?: { haptic?: boolean }) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      batchSelect.enterSelectMode(initialId, options);
    },
    [batchSelect],
  );

  const exitBatchMode = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    batchSelect.exitSelectMode();
  }, [batchSelect]);

  const visibleRecordIds = useMemo(() => filtered.map((r) => r.id), [filtered]);

  const { batchArchive, batchUnarchive, batchDelete, batchExport, batchMoveToFolder } =
    useBatchRecordActions({
      onComplete: exitBatchMode,
    });

  const [folderPickerVisible, setFolderPickerVisible] = useState(false);

  const handleOpenBatchFolderPicker = useCallback(() => {
    setFolderPickerVisible(true);
  }, []);

  const handleCloseBatchFolderPicker = useCallback(() => {
    setFolderPickerVisible(false);
  }, []);

  const handleBatchFolderPicked = useCallback(
    (folderId: string | null) => {
      void batchMoveToFolder([...batchSelect.selectedIds], folderId);
    },
    [batchMoveToFolder, batchSelect.selectedIds],
  );

  const isArchivedView = filterStatus === 'archived';

  const handleBatchArchive = useCallback(() => {
    void batchArchive([...batchSelect.selectedIds]);
  }, [batchArchive, batchSelect.selectedIds]);

  const handleBatchUnarchive = useCallback(() => {
    void batchUnarchive([...batchSelect.selectedIds]);
  }, [batchUnarchive, batchSelect.selectedIds]);

  const handleBatchDelete = useCallback(() => {
    batchDelete([...batchSelect.selectedIds]);
  }, [batchDelete, batchSelect.selectedIds]);

  const handleBatchExport = useCallback(() => {
    const selectedRecords = filtered.filter((r) => batchSelect.selectedIds.has(r.id));
    void batchExport(selectedRecords);
  }, [batchExport, filtered, batchSelect.selectedIds]);

  const handleSelectAll = useCallback(() => {
    if (batchSelect.selectedIds.size === visibleRecordIds.length) {
      batchSelect.clearSelection();
    } else {
      batchSelect.selectAll(visibleRecordIds);
    }
  }, [batchSelect, visibleRecordIds]);

  useEffect(() => {
    if (!inboxFiltersReset) return;
    return inboxFiltersReset.registerReset(() => {
      resetToDefault();
      setActiveFolder(null);
    });
  }, [inboxFiltersReset, resetToDefault, setActiveFolder]);

  useScrollToTopOnTabPress(listRef, () => {
    folderChipScrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    if (batchSelect.isSelectMode) exitBatchMode();
  });

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [filterStatus]);

  useEffect(() => {
    if (batchSelect.isSelectMode) exitBatchMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleRecordPress = useCallback(
    (item: VoiceRecord) => {
      if (batchSelect.isSelectMode) {
        batchSelect.toggleItem(item.id);
        return;
      }
      navigation.navigate('RecordingDetail', { record: item });
    },
    [navigation, batchSelect],
  );

  const handleStatusPress = useCallback(
    (item: VoiceRecord) => {
      if (batchSelect.isSelectMode) {
        batchSelect.toggleItem(item.id);
        return;
      }
      if (
        item.aiStatus === 'loading_model' ||
        item.aiStatus === 'processing' ||
        item.aiStatus === 'error' ||
        item.aiStatus === 'idle' ||
        item.summaryStatus === 'processing' ||
        item.summaryStatus === 'error' ||
        item.tasksStatus === 'processing' ||
        item.tasksStatus === 'error' ||
        item.translationStatus === 'processing' ||
        item.translationStatus === 'error'
      ) {
        navigation.navigate('RecordingDetail', { record: item });
      }
    },
    [navigation, batchSelect],
  );

  const handleRecordLongPress = useCallback(
    (item: VoiceRecord) => {
      if (!batchSelect.isSelectMode) {
        enterBatchMode(item.id);
      }
    },
    [batchSelect.isSelectMode, enterBatchMode],
  );

  const renderItem = useCallback(
    ({ item }: { item: FlattenedItem }) => (
      <InboxScreenListItem
        item={item}
        color={color}
        batchSelect={batchSelect}
        effectiveActiveFolderId={effectiveActiveFolderId}
        isPrivateMode={isPrivateMode}
        folderColorById={folderColorById}
        isProActive={isProActive}
        isArchivedView={isArchivedView}
        dismissSwipeHint={dismissSwipeHint}
        archiveRecord={archiveRecord}
        unarchiveRecord={unarchiveRecord}
        togglePin={togglePin}
        listRef={listRef}
        onRecordPress={handleRecordPress}
        onStatusPress={handleStatusPress}
        onRecordLongPress={handleRecordLongPress}
      />
    ),
    [
      color,
      effectiveActiveFolderId,
      folderColorById,
      isPrivateMode,
      isProActive,
      isArchivedView,
      dismissSwipeHint,
      archiveRecord,
      unarchiveRecord,
      togglePin,
      handleRecordPress,
      handleStatusPress,
      handleRecordLongPress,
      batchSelect,
    ],
  );

  const getItemType = useCallback((item: FlattenedItem) => item.type, []);

  const keyExtractor = useCallback((item: FlattenedItem) => {
    if (item.type === 'header') {
      return `header-${item.title}`;
    }
    return item.item.id;
  }, []);

  const onListEndReached = useCallback(() => {
    if (!canLoadMoreInbox) return;
    setVisibleRecordCount((c) => c + INBOX_RECORD_PAGE_SIZE);
  }, [canLoadMoreInbox]);

  const screenStyle = useMemo(
    () => ({ flex: 1, backgroundColor: color.background.primary }),
    [color.background.primary],
  );
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const listContentStyle = useMemo(
    () => ({
      paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
      paddingTop: 0,
      backgroundColor: color.background.secondary,
    }),
    [color.background.secondary, insets.bottom, isTablet],
  );
  const listStyle = useMemo(
    () => ({ backgroundColor: color.background.secondary }),
    [color.background.secondary],
  );

  const allSelected =
    visibleRecordIds.length > 0 && batchSelect.selectedIds.size === visibleRecordIds.length;

  return {
    t,
    color,
    insets,
    isTablet,
    contentMaxWidth,
    navigation,
    records,
    isLoaded,
    folders,
    effectiveActiveFolderId,
    setActiveFolder,
    isPrivateMode,
    subtitleText,
    folderModalVisible,
    editingFolder,
    openCreateFolderModal,
    openEditFolderModal,
    closeFolderModal,
    handleFolderSave,
    handleFolderDelete,
    runAutoOrganize,
    isAutoOrganizing,
    autoOrganizeOverlayVisible,
    autoOrganizeOverlayMode,
    query,
    setQuery,
    filtered,
    isSearching,
    filterStatus,
    setFilterStatus,
    menuFilterStatus,
    setMenuFilterStatus,
    sortOption,
    setSortOption,
    pagedFlattenedData,
    batchSelect,
    enterBatchMode,
    exitBatchMode,
    allSelected,
    handleSelectAll,
    handleSearchHeaderPress,
    handleCreateTextNote,
    searchBarExplicitOpen,
    showInboxSearchBar,
    emptyStatePlacement,
    searchFocusSignal,
    setSearchBarExplicitOpen,
    folderPickerVisible,
    handleOpenBatchFolderPicker,
    handleCloseBatchFolderPicker,
    handleBatchFolderPicked,
    isArchivedView,
    handleBatchArchive,
    handleBatchUnarchive,
    handleBatchDelete,
    handleBatchExport,
    showSwipeHint,
    dismissSwipeHint,
    listRef,
    folderChipScrollRef,
    screenStyle,
    bannerMaxWidth,
    listContentStyle,
    listStyle,
    renderItem,
    keyExtractor,
    getItemType,
    onListEndReached,
  };
}
