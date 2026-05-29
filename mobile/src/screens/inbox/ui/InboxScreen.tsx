import React from 'react';
import { View } from 'react-native';

import {
  FolderChipBar,
  FolderFormModal,
  FolderPickerSheet,
  FolderReorderSheet,
} from '@/entities/folder';
import { BatchActionBar, BatchExportSheet } from '@/features/batch-select';
import { AutoOrganizeProgressOverlay } from '@/features/manage-folders';
import { AutomationComingSoonSheet } from '@/screens/settings/ui/AutomationComingSoonSheet';
import { BlockingProgressModal } from '@/shared/ui';

import { useInboxScreen } from '../lib/useInboxScreen';
import { InboxHeader } from './InboxHeader';
import { InboxScreenEmptyLibrary } from './InboxScreenEmptyLibrary';
import { InboxScreenHeaderRight } from './InboxScreenHeaderRight';
import { InboxScreenLoadedBody } from './InboxScreenLoadedBody';
import { InboxSkeleton } from './InboxSkeleton';

export const InboxScreen = () => {
  const inbox = useInboxScreen();
  const {
    t,
    color,
    insets,
    isTablet,
    useTabletShell,
    contentMaxWidth,
    navigation,
    records,
    isLoaded,
    folders,
    effectiveActiveFolderId,
    handleFolderSelect,
    handleFoldersReorder,
    folderReorderVisible,
    openFolderReorderSheet,
    closeFolderReorderSheet,
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
    batchExportSheetVisible,
    batchExportProSheetVisible,
    handleCloseBatchExportSheet,
    handleCloseBatchExportProSheet,
    handleBatchExportProUpgrade,
    handleBatchExportTemplate,
    batchEmailSending,
    handleBatchEmail,
    batchSpeakerTurnsExportAvailable,
    isArchivedView,
    handleBatchArchive,
    handleBatchUnarchive,
    handleBatchDelete,
    handleBatchDeleteLongPress,
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
    showInboxScrollResetSkeleton,
    onInboxListScroll,
    batchProgressModal,
    isGeneratingSharePdf,
  } = inbox;

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
          <InboxScreenHeaderRight
            color={color}
            isLoaded={isLoaded}
            batchSelect={batchSelect}
            recordsLength={records.length}
            searchBarExplicitOpen={searchBarExplicitOpen}
            query={query}
            showInboxSearchBar={showInboxSearchBar}
            allSelected={allSelected}
            isPrivateMode={isPrivateMode}
            isAutoOrganizing={isAutoOrganizing}
            onSearchHeaderPress={handleSearchHeaderPress}
            onSelectAll={handleSelectAll}
            onAutoOrganize={() => {
              void runAutoOrganize();
            }}
            onEnterBatchMode={() => enterBatchMode(undefined, { haptic: false })}
            onOpenAllTasks={() => navigation.navigate('AllTasks')}
            onCreateTextNote={handleCreateTextNote}
            useTabletShell={useTabletShell}
            hideCreateTextNote={useTabletShell}
            t={t}
          />
        }
      />
      {!isPrivateMode && !useTabletShell && (
        <FolderChipBar
          folders={folders}
          activeFolderId={effectiveActiveFolderId}
          color={color}
          onSelect={handleFolderSelect}
          onCreatePress={openCreateFolderModal}
          onEditPress={openEditFolderModal}
          onReorderPress={openFolderReorderSheet}
          scrollRef={folderChipScrollRef}
        />
      )}
      {!isLoaded ? (
        <InboxSkeleton color={color} />
      ) : records.length === 0 ? (
        <InboxScreenEmptyLibrary
          color={color}
          insetsBottom={insets.bottom}
          isTablet={isTablet}
          bannerMaxWidth={bannerMaxWidth}
          title={t('inbox.emptyTitle')}
          description={t('inbox.emptyDescription')}
          hint={t('inbox.emptyImportHint')}
        />
      ) : (
        <InboxScreenLoadedBody
          color={color}
          insetsBottom={insets.bottom}
          isTablet={isTablet}
          hidePrimaryFilters={useTabletShell}
          contentMaxWidth={contentMaxWidth}
          filteredLength={filtered.length}
          showInboxSearchBar={showInboxSearchBar}
          query={query}
          onChangeQuery={setQuery}
          searchFocusSignal={searchFocusSignal}
          onSearchCleared={() => setSearchBarExplicitOpen(false)}
          batchSelect={batchSelect}
          filterStatus={filterStatus}
          menuFilterStatus={menuFilterStatus}
          sortOption={sortOption}
          onFilterChange={setFilterStatus}
          onMenuFilterChange={setMenuFilterStatus}
          onSortChange={setSortOption}
          showSwipeHint={showSwipeHint}
          onDismissSwipeHint={dismissSwipeHint}
          isSearching={isSearching}
          emptyStatePlacement={emptyStatePlacement}
          emptyFilterTitle={t('inbox.emptyFilterTitle')}
          emptyFilterDescription={t('inbox.emptyFilterDescription')}
          emptyFolderHint={effectiveActiveFolderId ? t('inbox.emptyFolderHint') : undefined}
          effectiveActiveFolderId={effectiveActiveFolderId}
          listRef={listRef}
          filterStatusKey={`${filterStatus}:${menuFilterStatus ?? 'none'}`}
          pagedFlattenedData={pagedFlattenedData}
          listContentStyle={listContentStyle}
          listStyle={listStyle}
          onEndReached={onListEndReached}
          renderListItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          onInboxListScroll={onInboxListScroll}
          showInboxScrollResetSkeleton={showInboxScrollResetSkeleton}
        />
      )}
      {batchSelect.isSelectMode && (
        <BatchActionBar
          count={batchSelect.selectedIds.size}
          color={color}
          showUnarchive={isArchivedView}
          onArchive={handleBatchArchive}
          onUnarchive={handleBatchUnarchive}
          onDelete={handleBatchDelete}
          onDeleteLongPress={handleBatchDeleteLongPress}
          onExport={handleBatchExport}
          onMoveToFolder={handleOpenBatchFolderPicker}
          hideMoveToFolder={isPrivateMode}
          onCancel={exitBatchMode}
          dockToScreenBottom
        />
      )}
      {!isPrivateMode && (
        <FolderPickerSheet
          visible={folderPickerVisible}
          title={t('folders.moveToFolderTitle')}
          subtitle={t('folders.moveToFolderSubtitle')}
          folders={folders}
          onClose={handleCloseBatchFolderPicker}
          onSelect={handleBatchFolderPicked}
        />
      )}
      <BatchExportSheet
        visible={batchExportSheetVisible}
        count={batchSelect.selectedIds.size}
        showSpeakerTurnsExport={batchSpeakerTurnsExportAvailable}
        isSendingEmail={batchEmailSending}
        onClose={handleCloseBatchExportSheet}
        onExportText={handleBatchExportTemplate}
        onEmailBatch={handleBatchEmail}
      />
      <AutomationComingSoonSheet
        visible={batchExportProSheetVisible}
        feature="batchExport"
        onClose={handleCloseBatchExportProSheet}
        onUpgradePress={handleBatchExportProUpgrade}
      />
      {!isPrivateMode && (
        <FolderReorderSheet
          visible={folderReorderVisible}
          folders={folders}
          onClose={closeFolderReorderSheet}
          onReorder={handleFoldersReorder}
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
      <BlockingProgressModal
        visible={batchProgressModal != null}
        title={batchProgressModal?.title ?? ''}
        description={batchProgressModal?.description ?? ''}
        total={batchProgressModal?.total ?? 0}
        progressLabel={batchProgressModal?.progressLabel}
      />
      <BlockingProgressModal
        visible={isGeneratingSharePdf}
        title={t('share.generatingPdfTitle')}
        description={t('share.generatingPdfDescription')}
        total={0}
      />
    </View>
  );
};
