import React from 'react';
import { View } from 'react-native';

import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import {
  FolderChipBar,
  FolderFormModal,
  FolderPickerSheet,
  FolderReorderSheet,
} from '@/entities/folder';
import { BatchActionBar, BatchExportSheet } from '@/features/batch-select';
import { useImportFileAction } from '@/features/import-audio-file';
import {
  AiOrganizeActionSheet,
  AiOrganizeTemplateSheet,
  AutoOrganizeProgressOverlay,
} from '@/features/manage-folders';
import { ShareRecordSheet } from '@/screens/recording-detail/ui/ShareRecordSheet';
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
  const importFile = useImportFileAction();
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
    foldersEnabled,
    headerTitle,
    headerSubtitleText,
    folderModalVisible,
    editingFolder,
    openCreateFolderModal,
    openEditFolderModal,
    closeFolderModal,
    handleFolderSave,
    handleFolderDelete,
    openAiOrganizeSheet,
    closeAiOrganizeSheet,
    aiOrganizeSheetVisible,
    aiOrganizePresentKey,
    aiOrganizeTemplateSheetVisible,
    closeAiOrganizeTemplateSheet,
    pendingAutoOrganizeTemplate,
    setPendingAutoOrganizeTemplate,
    handleAiOrganizeActionSelect,
    handleAiOrganizeTemplateSelect,
    cancelAutoOrganize,
    isAutoOrganizing,
    autoOrganizeActiveMode,
    autoOrganizeOverlayVisible,
    autoOrganizeOverlayMode,
    autoOrganizeEligibleCount,
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
    handleOpenNotesGraph,
    handleCloseNotesGraphProSheet,
    handleNotesGraphProUpgrade,
    notesGraphProSheetVisible,
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
    inboxCardLayout,
    handleInboxCardLayoutChange,
    shareSheetVisible,
    shareTargetRecord,
    shareEmailSending,
    handleCloseShareSheet,
    handleShareRecordText,
    handleShareRecordAudio,
    handleEmailShareRecord,
    renameRecordSheet,
    isProActive,
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
            : headerSubtitleText
        }
        title={headerTitle}
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
            foldersEnabled={foldersEnabled}
            isAutoOrganizing={isAutoOrganizing}
            onSearchHeaderPress={handleSearchHeaderPress}
            onSelectAll={handleSelectAll}
            onOpenAiOrganizeSheet={openAiOrganizeSheet}
            onEnterBatchMode={() => enterBatchMode(undefined, { haptic: false })}
            onOpenAllTasks={() => navigation.navigate('AllTasks')}
            onOpenNotesGraph={handleOpenNotesGraph}
            onCreateTextNote={handleCreateTextNote}
            onImportFile={() => {
              void importFile();
            }}
            useTabletShell={useTabletShell}
            hideCreateTextNote={useTabletShell}
            t={t}
          />
        }
      />
      {foldersEnabled && !useTabletShell && (
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
          cardLayout={inboxCardLayout}
          onCardLayoutChange={handleInboxCardLayoutChange}
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
          hideMoveToFolder={!foldersEnabled}
          onCancel={exitBatchMode}
          dockToScreenBottom
        />
      )}
      {foldersEnabled && (
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
      <AutomationComingSoonSheet
        visible={notesGraphProSheetVisible}
        feature="notesGraph"
        onClose={handleCloseNotesGraphProSheet}
        onUpgradePress={handleNotesGraphProUpgrade}
      />
      {foldersEnabled && (
        <FolderReorderSheet
          visible={folderReorderVisible}
          folders={folders}
          onClose={closeFolderReorderSheet}
          onReorder={handleFoldersReorder}
        />
      )}
      {foldersEnabled && (
        <FolderFormModal
          visible={folderModalVisible}
          folder={editingFolder}
          onSave={handleFolderSave}
          onDelete={editingFolder ? () => handleFolderDelete(editingFolder.id) : undefined}
          onClose={closeFolderModal}
        />
      )}
      {foldersEnabled ? (
        <>
          <AiOrganizeActionSheet
            visible={aiOrganizeSheetVisible}
            presentRequestKey={aiOrganizePresentKey}
            eligibleCount={autoOrganizeEligibleCount}
            onClose={closeAiOrganizeSheet}
            onSelect={handleAiOrganizeActionSelect}
          />
          <AiOrganizeTemplateSheet
            visible={aiOrganizeTemplateSheetVisible}
            selectedTemplate={pendingAutoOrganizeTemplate}
            isProActive={isProActive}
            onClose={closeAiOrganizeTemplateSheet}
            onSelect={(template) => {
              setPendingAutoOrganizeTemplate(template);
              handleAiOrganizeTemplateSelect(template);
            }}
            onProRequired={() => {
              closeAiOrganizeTemplateSheet();
              openPlanPaywall();
            }}
          />
        </>
      ) : null}
      <AutoOrganizeProgressOverlay
        visible={autoOrganizeOverlayVisible}
        mode={autoOrganizeOverlayMode}
        organizeMode={autoOrganizeActiveMode}
        onCancel={cancelAutoOrganize}
      />
      <BlockingProgressModal
        visible={batchProgressModal != null}
        title={batchProgressModal?.title ?? ''}
        description={batchProgressModal?.description ?? ''}
        total={batchProgressModal?.total ?? 0}
        progressLabel={batchProgressModal?.progressLabel}
      />
      <BlockingProgressModal
        visible={isGeneratingSharePdf && !batchExportSheetVisible && !shareSheetVisible}
        title={t('share.generatingPdfTitle')}
        description={t('share.generatingPdfDescription')}
        total={0}
      />
      <ShareRecordSheet
        visible={shareSheetVisible}
        hasAudio={Boolean(shareTargetRecord?.audioPath?.trim())}
        isMeeting={shareTargetRecord?.classification === 'meeting'}
        showSpeakerTurnsExport={
          isProActive &&
          shareTargetRecord?.classification === 'meeting' &&
          Boolean(shareTargetRecord.meetingDialogue?.trim())
        }
        isSendingEmail={shareEmailSending}
        onClose={handleCloseShareSheet}
        onShareText={handleShareRecordText}
        onEmailRecord={handleEmailShareRecord}
        onShareAudio={handleShareRecordAudio}
      />
      {renameRecordSheet}
    </View>
  );
};
