import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Folder, Folders, GalleryHorizontalEnd, ListTodo, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type {
  BottomTabParamList,
  InboxStackParamList,
  RootStackParamList,
} from '@/app/navigation/types';
import {
  FolderChipBar,
  FolderFormModal,
  FolderPickerSheet,
  useFolderStore,
} from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { RecordCard, useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import {
  BatchActionBar,
  BatchCheckbox,
  useBatchRecordActions,
  useBatchSelect,
} from '@/features/batch-select';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { InboxFilterBar, useInboxFiltersReset } from '@/features/inbox-filters';
import {
  AutoOrganizeProgressOverlay,
  useAutoOrganizeFolders,
  useManageFolders,
} from '@/features/manage-folders';
import { useProEntitlement } from '@/features/pro-license';
import { SearchBar, useSearchRecords } from '@/features/search-records';
import { useColors } from '@/shared/config';
import {
  keyboardAvoidingBehavior,
  keyboardVerticalOffset,
  resolveDisplayFolderColor,
  useScrollToTopOnTabPress,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { getHasSeenSwipeHint, setHasSeenSwipeHint } from '@/shared/lib/hintsStorage';
import { Button, EmptyState, SectionHeader, SwipeableCard, SwipeHintBanner } from '@/shared/ui';

import { countFlattenedRecords, trimFlattenedInboxItems } from '../lib/trimFlattenedInboxItems';
import { EmptySearchState } from './EmptySearchState';
import { InboxHeader } from './InboxHeader';
import { InboxSkeleton } from './InboxSkeleton';

const INBOX_RECORD_PAGE_SIZE = 48;

type FlattenedItem =
  | { type: 'header'; title: string; isFirst: boolean }
  | { type: 'record'; item: VoiceRecord };

type InboxNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Inbox'>,
  CompositeNavigationProp<
    NativeStackNavigationProp<InboxStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

export const InboxScreen = () => {
  const { t } = useTranslation();
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

  const handleSearchHeaderPress = useCallback(() => {
    const barVisible = searchBarExplicitOpen || query.trim().length > 0;
    if (barVisible && query.trim() === '') {
      setSearchBarExplicitOpen(false);
    } else {
      setSearchBarExplicitOpen(true);
      setSearchFocusSignal((n) => n + 1);
    }
  }, [searchBarExplicitOpen, query]);

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
    ({ item }: { item: FlattenedItem }) => {
      if (item.type === 'header') {
        return <SectionHeader title={item.title} isFirst={item.isFirst} />;
      }

      const isSelected = batchSelect.selectedIds.has(item.item.id);
      const folderStripeColor =
        !effectiveActiveFolderId && !isPrivateMode && item.item.folderId
          ? resolveDisplayFolderColor(folderColorById.get(item.item.folderId), isProActive)
          : undefined;

      if (batchSelect.isSelectMode) {
        const toggle = () => batchSelect.toggleItem(item.item.id);
        return (
          <Pressable
            onPress={toggle}
            accessibilityRole="checkbox"
            accessibilityLabel={item.item.title}
            accessibilityState={{ checked: isSelected }}
            style={{
              marginHorizontal: 16,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{ paddingRight: 10, alignSelf: 'stretch', justifyContent: 'center' }}
              pointerEvents="none"
            >
              <BatchCheckbox isSelected={isSelected} color={color} size={22} />
            </View>
            <View style={{ flex: 1 }} pointerEvents="box-none">
              <RecordCard
                item={item.item}
                color={color}
                folderAccentColor={folderStripeColor}
                onPress={toggle}
                onStatusPress={toggle}
                onLongPress={toggle}
                a11yHint={null}
                hideAccessibilitySubtree
              />
            </View>
          </Pressable>
        );
      }

      return (
        <SwipeableCard
          isPinned={item.item.isPinned}
          leftAction={isArchivedView ? 'unarchive' : 'archive'}
          onLeftAction={() => {
            dismissSwipeHint();
            listRef.current?.prepareForLayoutAnimationRender();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            isArchivedView ? unarchiveRecord(item.item.id) : archiveRecord(item.item.id);
          }}
          onPin={() => {
            dismissSwipeHint();
            togglePin(item.item.id);
          }}
        >
          <RecordCard
            item={item.item}
            color={color}
            folderAccentColor={folderStripeColor}
            onPress={() => handleRecordPress(item.item)}
            onStatusPress={() => handleStatusPress(item.item)}
            onLongPress={() => handleRecordLongPress(item.item)}
          />
        </SwipeableCard>
      );
    },
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

  const screenStyle = { flex: 1, backgroundColor: color.background.primary };
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const listContentStyle = {
    paddingBottom: 80,
    paddingTop: 0,
    backgroundColor: color.background.secondary,
  };
  const listStyle = { backgroundColor: color.background.secondary };

  const allSelected =
    visibleRecordIds.length > 0 && batchSelect.selectedIds.size === visibleRecordIds.length;

  return (
    <View style={[screenStyle, { flex: 1 }]}>
      <InboxHeader
        color={color}
        isLoaded={isLoaded}
        isPrivateMode={isPrivateMode}
        subtitleText={
          batchSelect.isSelectMode
            ? t('batch.selectedCount', { count: batchSelect.selectedIds.size })
            : subtitleText
        }
        title={t('inbox.title')}
        rightSlot={
          isLoaded ? (
            batchSelect.isSelectMode ? (
              <Button
                iconOnly={false}
                variant="icon"
                size="md"
                label={allSelected ? t('batch.deselectAll') : t('batch.selectAll')}
                color={color}
                onPress={handleSelectAll}
              />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {records.length > 0 && (
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
                    onPress={handleSearchHeaderPress}
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
                    onPress={() => {
                      void runAutoOrganize();
                    }}
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
                  icon={
                    <GalleryHorizontalEnd size={21} color={color.text.primary} strokeWidth={2.3} />
                  }
                  color={color}
                  onPress={() => enterBatchMode(undefined, { haptic: false })}
                  accessibilityLabel={t('batch.a11yEnterSelectMode')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                />
                <Button
                  iconOnly
                  variant="icon"
                  size="md"
                  icon={<ListTodo size={22} color={color.text.primary} strokeWidth={2.2} />}
                  color={color}
                  onPress={() => navigation.navigate('AllTasks')}
                  accessibilityLabel={t('allTasks.a11yOpenAllTasks')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                />
              </View>
            )
          ) : undefined
        }
      />
      {!isPrivateMode && (
        <FolderChipBar
          folders={folders}
          activeFolderId={effectiveActiveFolderId}
          color={color}
          onSelect={setActiveFolder}
          onCreatePress={openCreateFolderModal}
          onEditPress={openEditFolderModal}
          scrollRef={folderChipScrollRef}
        />
      )}
      {!isLoaded ? (
        <InboxSkeleton color={color} />
      ) : records.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              title={t('inbox.emptyTitle')}
              description={t('inbox.emptyDescription')}
              hint={t('inbox.emptyImportHint')}
            />
          </View>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} density="compact" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: color.background.secondary }}
          behavior={keyboardAvoidingBehavior}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
            {showInboxSearchBar && (
              <SearchBar
                query={query}
                onChangeQuery={setQuery}
                color={color}
                variant="compact"
                focusSignal={searchFocusSignal}
                onCleared={() => setSearchBarExplicitOpen(false)}
              />
            )}
            {!batchSelect.isSelectMode && (
              <InboxFilterBar
                filterStatus={filterStatus}
                sortOption={sortOption}
                onFilterChange={setFilterStatus}
                onSortChange={setSortOption}
                color={color}
              />
            )}
            {showSwipeHint && !batchSelect.isSelectMode && (
              <View style={{ marginTop: showInboxSearchBar ? 4 : 0 }}>
                <SwipeHintBanner onDismiss={dismissSwipeHint} />
              </View>
            )}
            {isSearching && filtered.length === 0 ? (
              <EmptySearchState query={query} color={color} />
            ) : filtered.length === 0 ? (
              <EmptyState
                title={t('inbox.emptyFilterTitle')}
                description={t('inbox.emptyFilterDescription')}
                hint={effectiveActiveFolderId ? t('inbox.emptyFolderHint') : undefined}
                hintIcon={
                  effectiveActiveFolderId ? (
                    <Folder
                      size={20}
                      color={color.accent.primary}
                      strokeWidth={2}
                      style={{ marginRight: 12 }}
                    />
                  ) : undefined
                }
              />
            ) : (
              <FlashList
                ref={listRef}
                key={filterStatus}
                data={pagedFlattenedData}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemType={getItemType}
                onEndReached={onListEndReached}
                onEndReachedThreshold={0.35}
                contentContainerStyle={listContentStyle}
                style={listStyle}
                showsVerticalScrollIndicator={false}
                extraData={batchSelect.selectedIds}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      )}
      {batchSelect.isSelectMode && (
        <BatchActionBar
          count={batchSelect.selectedIds.size}
          color={color}
          showUnarchive={isArchivedView}
          onArchive={handleBatchArchive}
          onUnarchive={handleBatchUnarchive}
          onDelete={handleBatchDelete}
          onExport={handleBatchExport}
          onMoveToFolder={handleOpenBatchFolderPicker}
          hideMoveToFolder={isPrivateMode}
          onCancel={exitBatchMode}
        />
      )}
      {!isPrivateMode && (
        <FolderPickerSheet
          visible={folderPickerVisible}
          title={t('folders.moveToFolderTitle')}
          folders={folders}
          onClose={handleCloseBatchFolderPicker}
          onSelect={handleBatchFolderPicked}
        />
      )}
      {!isPrivateMode && (
        <FolderFormModal
          visible={folderModalVisible}
          folder={editingFolder}
          onSave={handleFolderSave}
          onDelete={editingFolder ? () => handleFolderDelete(editingFolder.id) : undefined}
          onClose={closeFolderModal}
        />
      )}
      <AutoOrganizeProgressOverlay
        visible={autoOrganizeOverlayVisible}
        mode={autoOrganizeOverlayMode}
      />
    </View>
  );
};
