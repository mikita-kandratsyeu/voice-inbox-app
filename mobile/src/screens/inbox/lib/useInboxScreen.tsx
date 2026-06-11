import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Alert, LayoutAnimation, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  buildFloatingTabBarStyle,
  floatingTabBarShadowOpacity,
  getFloatingTabBarScrollPaddingBottom,
  getInboxBatchModeScrollPaddingBottom,
} from '@/app/navigation/config';
import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import {
  mapTabletSidebarTargetToFilter,
  registerTabletInboxSidebarNavHandler,
  registerTabletOpenCreateFolderHandler,
  registerTabletOpenEditFolderHandler,
  registerTabletOpenReorderFoldersHandler,
} from '@/app/navigation/tablet';
import { useTabletInboxSidebarStore } from '@/app/navigation/tablet/tabletInboxSidebarStore';
import type { BottomTabParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { areFoldersEnabledInAiMode, useSettingsStore } from '@/entities/settings';
import { useAdsAllowed } from '@/features/app-storefront';
import { useAutoArchiveReadNotes } from '@/features/auto-archive';
import {
  type BatchExportPackaging,
  type BatchProgressKind,
  useBatchRecordActions,
  useBatchSelect,
} from '@/features/batch-select';
import { useInboxCardLayoutStore } from '@/features/inbox-card-layout';
import { useInboxFiltersReset } from '@/features/inbox-filters';
import { useAutoOrganizeFolders, useManageFolders } from '@/features/manage-folders';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { useProEntitlement } from '@/features/pro-license';
import { useSearchRecords } from '@/features/search-records';
import {
  saveLastShareRecipientEmail,
  type ShareBriefTemplate,
  type ShareRecordExportFormat,
  useShareRecord,
} from '@/features/share-record';
import { useColors } from '@/shared/config';
import {
  flashListJumpToTop,
  hapticError,
  hapticSuccess,
  useIsTablet,
  useScrollToTopOnTabPress,
  useTabletContentMaxWidth,
  useTabletShellLayout,
} from '@/shared/lib';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';
import { getHasSeenSwipeHint, setHasSeenSwipeHint } from '@/shared/lib/hintsStorage';

import { InboxScreenListItem } from '../ui/InboxScreenListItem';
import {
  type FlattenedItem,
  INBOX_RECORD_PAGE_SIZE,
  type InboxNavigationProp,
} from './inboxScreenTypes';
import { injectInboxListBannerCard } from './injectInboxListBannerCard';
import { countFlattenedRecords, trimFlattenedInboxItems } from './trimFlattenedInboxItems';

const INBOX_LIST_SCROLL_TOP_EPSILON = 8;

export function useInboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const useTabletShell = useTabletShellLayout();
  const setTabletSidebarFilterStatus = useTabletInboxSidebarStore((s) => s.setFilterStatus);
  const color = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const contentMaxWidth = useTabletContentMaxWidth('wide');
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const navigation = useNavigation<InboxNavigationProp>();
  const isInboxTabFocused = useIsFocused();
  const { records, isLoaded, archiveRecord, unarchiveRecord, togglePin } = useRecordStore(
    useShallow((s) => ({
      records: s.records,
      isLoaded: s.isLoaded,
      archiveRecord: s.archiveRecord,
      unarchiveRecord: s.unarchiveRecord,
      togglePin: s.togglePin,
    })),
  );

  const { folders, activeFolderId, setActiveFolder, reorderFolders } = useFolderStore(
    useShallow((s) => ({
      folders: s.folders,
      activeFolderId: s.activeFolderId,
      setActiveFolder: s.setActiveFolder,
      reorderFolders: s.reorderFolders,
    })),
  );
  const { isProActive } = useProEntitlement();
  const { adsAllowed } = useAdsAllowed();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const foldersEnabled = areFoldersEnabledInAiMode(aiExecutionMode, privateAiProvider);

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
    cancelAutoOrganize,
    isRunning: isAutoOrganizing,
    overlayVisible: autoOrganizeOverlayVisible,
    overlayMode: autoOrganizeOverlayMode,
  } = useAutoOrganizeFolders(records, {
    onResult: (result) => {
      navigation.navigate('AutoOrganizeReview', { result });
    },
  });

  const effectiveActiveFolderId = foldersEnabled ? activeFolderId : null;

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

  const folderNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of folders) {
      m.set(f.id, f.name);
    }
    return m;
  }, [folders]);

  const folderIconById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of folders) {
      m.set(f.id, f.icon);
    }
    return m;
  }, [folders]);

  const inboxCardLayout = useInboxCardLayoutStore((s) => s.layout);
  const setInboxCardLayout = useInboxCardLayoutStore((s) => s.setLayout);

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

  const activeFolder = useMemo(
    () =>
      effectiveActiveFolderId
        ? (folders.find((f) => f.id === effectiveActiveFolderId) ?? null)
        : null,
    [effectiveActiveFolderId, folders],
  );

  const headerTitle = useMemo(() => {
    if (!useTabletShell) {
      return t('inbox.title');
    }
    if (activeFolder) {
      return activeFolder.name;
    }
    if (filterStatus === 'pinned') {
      return t('inbox.filters.pinned');
    }
    if (filterStatus === 'archived') {
      return t('inbox.filters.archived');
    }
    return t('inbox.title');
  }, [activeFolder, filterStatus, t, useTabletShell]);

  const headerSubtitleText = useMemo(() => {
    if (!useTabletShell) {
      return subtitleText;
    }
    if (menuFilterStatus) {
      return t('inbox.filterSummary', {
        filterName: t(`inbox.filters.${menuFilterStatus}`),
        count: filtered.length,
      });
    }
    if (isSearching) {
      return subtitleText;
    }
    return t('inbox.recordsCount', { count: filtered.length });
  }, [filtered.length, isSearching, menuFilterStatus, subtitleText, t, useTabletShell]);

  const totalFlattenedRecords = useMemo(
    () => countFlattenedRecords(flattenedData),
    [flattenedData],
  );

  const [visibleRecordCount, setVisibleRecordCount] = useState(INBOX_RECORD_PAGE_SIZE);

  useEffect(() => {
    setVisibleRecordCount(INBOX_RECORD_PAGE_SIZE);
  }, [filterStatus, sortOption, debouncedQuery]);

  const listRef = useRef<FlashListRef<FlattenedItem>>(null);
  const folderChipScrollRef = useRef<ScrollView>(null);
  const listScrollOffsetYRef = useRef(0);
  const inboxFiltersReset = useInboxFiltersReset();
  const [showSwipeHint, setShowSwipeHint] = useState(() => !getHasSeenSwipeHint());

  const dismissSwipeHint = useCallback(() => {
    setHasSeenSwipeHint();
    setShowSwipeHint(false);
  }, []);

  const batchSelect = useBatchSelect();

  const [batchProgress, setBatchProgress] = useState<{
    kind: BatchProgressKind;
    current: number;
    total: number;
  } | null>(null);

  const onBatchStart = useCallback((kind: BatchProgressKind, total: number) => {
    setBatchProgress({ kind, current: 0, total });
  }, []);

  const onBatchStep = useCallback((current: number, total: number) => {
    setBatchProgress((prev) => (prev ? { ...prev, current, total } : null));
  }, []);

  const clearBatchProgress = useCallback(() => {
    setBatchProgress(null);
  }, []);

  const shouldInjectListBanner =
    adsAllowed && !batchSelect.isSelectMode && !isSearching && getHasSeenOnboarding();

  const flattenedDataWithOptionalBanner = useMemo(() => {
    if (!shouldInjectListBanner) return flattenedData;
    return injectInboxListBannerCard(flattenedData);
  }, [flattenedData, shouldInjectListBanner]);

  const pagedFlattenedData = useMemo(
    () => trimFlattenedInboxItems(flattenedDataWithOptionalBanner, visibleRecordCount),
    [flattenedDataWithOptionalBanner, visibleRecordCount],
  );

  const canLoadMoreInbox = totalFlattenedRecords > visibleRecordCount;

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

  const handleOpenNotesGraph = useCallback(() => {
    if (isProActive) {
      navigation.navigate('NotesGraph');
      return;
    }
    setNotesGraphProSheetVisible(true);
  }, [isProActive, navigation]);

  const handleCloseNotesGraphProSheet = useCallback(() => {
    setNotesGraphProSheetVisible(false);
  }, []);

  const handleNotesGraphProUpgrade = useCallback(() => {
    setNotesGraphProSheetVisible(false);
    openPlanPaywall();
  }, []);

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

  const batchSpeakerTurnsExportAvailable = useMemo(() => {
    if (!isProActive) return false;
    const selected = filtered.filter((r) => batchSelect.selectedIds.has(r.id));
    return selected.some(
      (r) => r.classification === 'meeting' && Boolean(r.meetingDialogue?.trim()),
    );
  }, [batchSelect.selectedIds, filtered, isProActive]);

  const {
    batchArchive,
    batchUnarchive,
    batchDelete,
    batchDeleteForever,
    batchExport,
    batchEmailExport,
    batchMoveToFolder,
    isGeneratingSharePdf,
  } = useBatchRecordActions({
    onComplete: exitBatchMode,
    onBatchStart,
    onProgress: onBatchStep,
    onBatchFinally: clearBatchProgress,
  });

  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [folderReorderVisible, setFolderReorderVisible] = useState(false);
  const [batchExportSheetVisible, setBatchExportSheetVisible] = useState(false);
  const [batchExportProSheetVisible, setBatchExportProSheetVisible] = useState(false);
  const [notesGraphProSheetVisible, setNotesGraphProSheetVisible] = useState(false);
  const [batchEmailSending, setBatchEmailSending] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareTargetRecordId, setShareTargetRecordId] = useState<string | null>(null);
  const [shareEmailSending, setShareEmailSending] = useState(false);
  const {
    shareRecord,
    shareAudio,
    emailRecord,
    isGeneratingSharePdf: isGeneratingSingleSharePdf,
  } = useShareRecord();

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

  const handleBatchDeleteLongPress = useCallback(() => {
    batchDeleteForever([...batchSelect.selectedIds]);
  }, [batchDeleteForever, batchSelect.selectedIds]);

  const handleBatchExport = useCallback(() => {
    if (isProActive) {
      setBatchExportSheetVisible(true);
      return;
    }
    setBatchExportProSheetVisible(true);
  }, [isProActive]);

  const handleCloseBatchExportSheet = useCallback(() => {
    setBatchExportSheetVisible(false);
  }, []);

  const handleCloseBatchExportProSheet = useCallback(() => {
    setBatchExportProSheetVisible(false);
  }, []);

  const handleBatchExportProUpgrade = useCallback(() => {
    setBatchExportProSheetVisible(false);
    openPlanPaywall();
  }, []);

  const handleBatchExportTemplate = useCallback(
    (template: ShareBriefTemplate, packaging: BatchExportPackaging) => {
      const selectedRecords = filtered.filter((r) => batchSelect.selectedIds.has(r.id));
      return batchExport(selectedRecords, template, packaging);
    },
    [batchExport, filtered, batchSelect.selectedIds],
  );

  const handleBatchEmail = useCallback(
    async (email: string, template: ShareBriefTemplate, packaging: BatchExportPackaging) => {
      const selectedRecords = filtered.filter((r) => batchSelect.selectedIds.has(r.id));
      setBatchEmailSending(true);
      try {
        const { autoZipFallback } = await batchEmailExport(
          selectedRecords,
          template,
          email,
          packaging,
        );
        saveLastShareRecipientEmail(email);
        hapticSuccess();
        handleCloseBatchExportSheet();
        Alert.alert(
          t('share.emailSentTitle'),
          autoZipFallback
            ? t('batch.emailAutoZipFallback', { email })
            : t('share.emailBatchSentMessage', { email }),
        );
      } catch (err) {
        hapticError();
        Alert.alert(
          t('share.emailFailedTitle'),
          err instanceof Error ? toUserFacingFetchErrorFromUnknown(err) : t('batch.exportFailed'),
        );
      } finally {
        setBatchEmailSending(false);
      }
    },
    [batchEmailExport, filtered, batchSelect.selectedIds, handleCloseBatchExportSheet, t],
  );

  const handleSelectAll = useCallback(() => {
    if (batchSelect.selectedIds.size === visibleRecordIds.length) {
      batchSelect.clearSelection();
    } else {
      batchSelect.selectAll(visibleRecordIds);
    }
  }, [batchSelect, visibleRecordIds]);

  const handleFoldersReorder = useCallback(
    (orderedIds: string[]) => {
      void reorderFolders(orderedIds);
    },
    [reorderFolders],
  );

  const openFolderReorderSheet = useCallback(() => setFolderReorderVisible(true), []);
  const closeFolderReorderSheet = useCallback(() => setFolderReorderVisible(false), []);

  const inboxScrollResetSkeletonDepthRef = useRef(0);
  const [showInboxScrollResetSkeleton, setShowInboxScrollResetSkeleton] = useState(false);

  const scheduleInboxScrollResetSkeletonEnd = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inboxScrollResetSkeletonDepthRef.current = Math.max(
          0,
          inboxScrollResetSkeletonDepthRef.current - 1,
        );
        setShowInboxScrollResetSkeleton(inboxScrollResetSkeletonDepthRef.current > 0);
      });
    });
  }, []);

  const beginInboxScrollResetSkeletonIfScrolled = useCallback(() => {
    const listVisible = filtered.length > 0;
    const notAtTop = listScrollOffsetYRef.current > INBOX_LIST_SCROLL_TOP_EPSILON;
    if (!listVisible || !notAtTop) {
      return false;
    }
    inboxScrollResetSkeletonDepthRef.current += 1;
    setShowInboxScrollResetSkeleton(true);
    return true;
  }, [filtered.length]);

  const tabScrollSkeletonSkipEndStackRef = useRef<boolean[]>([]);
  const onTabScrollJumpVisualStart = useCallback(() => {
    const showed = beginInboxScrollResetSkeletonIfScrolled();
    tabScrollSkeletonSkipEndStackRef.current.push(!showed);
  }, [beginInboxScrollResetSkeletonIfScrolled]);
  const onTabScrollJumpVisualEnd = useCallback(() => {
    const skipEnd = tabScrollSkeletonSkipEndStackRef.current.pop() ?? true;
    if (skipEnd) {
      return;
    }
    inboxScrollResetSkeletonDepthRef.current = Math.max(
      0,
      inboxScrollResetSkeletonDepthRef.current - 1,
    );
    setShowInboxScrollResetSkeleton(inboxScrollResetSkeletonDepthRef.current > 0);
  }, []);

  useEffect(() => {
    if (filtered.length === 0) {
      listScrollOffsetYRef.current = 0;
    }
  }, [filtered.length]);

  useEffect(() => {
    listScrollOffsetYRef.current = 0;
  }, [filterStatus, menuFilterStatus]);

  const handleInboxListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    listScrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const handleFolderSelect = useCallback(
    (id: string | null) => {
      setActiveFolder(id);
      if (id === null) {
        folderChipScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
        const showedSkeleton = beginInboxScrollResetSkeletonIfScrolled();
        flashListJumpToTop(listRef.current ?? undefined);
        if (showedSkeleton) {
          scheduleInboxScrollResetSkeletonEnd();
        }
      }
    },
    [setActiveFolder, beginInboxScrollResetSkeletonIfScrolled, scheduleInboxScrollResetSkeletonEnd],
  );

  useEffect(() => {
    setTabletSidebarFilterStatus(filterStatus);
  }, [filterStatus, setTabletSidebarFilterStatus]);

  useEffect(() => {
    return registerTabletInboxSidebarNavHandler((target) => {
      if (target.kind === 'inbox') {
        inboxFiltersReset?.triggerReset();
        return;
      }
      setFilterStatus(mapTabletSidebarTargetToFilter(target));
      if (target.kind === 'folder') {
        handleFolderSelect(target.folderId);
        return;
      }
      handleFolderSelect(null);
    });
  }, [handleFolderSelect, inboxFiltersReset, setFilterStatus]);

  useEffect(() => {
    return registerTabletOpenCreateFolderHandler(() => {
      openCreateFolderModal();
    });
  }, [openCreateFolderModal]);

  useEffect(() => {
    return registerTabletOpenEditFolderHandler((folderId) => {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        openEditFolderModal(folder);
      }
    });
  }, [folders, openEditFolderModal]);

  useEffect(() => {
    return registerTabletOpenReorderFoldersHandler(() => {
      openFolderReorderSheet();
    });
  }, [openFolderReorderSheet]);

  useEffect(() => {
    if (!inboxFiltersReset) return;
    return inboxFiltersReset.registerReset(() => {
      resetToDefault();
      handleFolderSelect(null);
    });
  }, [inboxFiltersReset, resetToDefault, handleFolderSelect]);

  useScrollToTopOnTabPress(
    listRef,
    () => {
      folderChipScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      if (batchSelect.isSelectMode) exitBatchMode();
    },
    onTabScrollJumpVisualStart,
    onTabScrollJumpVisualEnd,
  );

  useEffect(() => {
    flashListJumpToTop(listRef.current ?? undefined);
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
        item.translationStatus === 'error' ||
        item.askAiStatus === 'processing' ||
        item.askAiStatus === 'error' ||
        item.meetingDialogueStatus === 'processing' ||
        item.meetingDialogueStatus === 'failed'
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

  const shareTargetRecord = useMemo(
    () =>
      shareTargetRecordId ? (records.find((r) => r.id === shareTargetRecordId) ?? null) : null,
    [records, shareTargetRecordId],
  );

  const handleCloseShareSheet = useCallback(() => {
    setShareSheetVisible(false);
    setShareTargetRecordId(null);
  }, []);

  const handleRecordShare = useCallback(
    (item: VoiceRecord) => {
      if (isProActive) {
        setShareTargetRecordId(item.id);
        setShareSheetVisible(true);
        return;
      }
      shareRecord(item, 'noteBrief', 'markdown').catch((err: unknown) => {
        Alert.alert(
          t('recordingDetail.shareFailed'),
          err instanceof Error ? toUserFacingFetchErrorFromUnknown(err) : t('batch.exportFailed'),
        );
      });
    },
    [isProActive, shareRecord, t],
  );

  const handleShareRecordText = useCallback(
    (template: ShareBriefTemplate, format: ShareRecordExportFormat) => {
      if (!shareTargetRecord) return Promise.resolve();
      return shareRecord(shareTargetRecord, template, format).catch((err: unknown) => {
        Alert.alert(
          t('recordingDetail.shareFailed'),
          err instanceof Error ? toUserFacingFetchErrorFromUnknown(err) : t('batch.exportFailed'),
        );
      });
    },
    [shareRecord, shareTargetRecord, t],
  );

  const handleShareRecordAudio = useCallback(() => {
    if (!shareTargetRecord) return;
    shareAudio(shareTargetRecord).catch((err: unknown) => {
      Alert.alert(
        t('recordingDetail.shareFailed'),
        err instanceof Error ? toUserFacingFetchErrorFromUnknown(err) : t('batch.exportFailed'),
      );
    });
  }, [shareAudio, shareTargetRecord, t]);

  const handleOpenAllTasksForNote = useCallback(
    (recordId: string) => {
      navigation.navigate('AllTasks', { recordId });
    },
    [navigation],
  );

  const handleEmailShareRecord = useCallback(
    (email: string, template: ShareBriefTemplate, format: ShareRecordExportFormat) => {
      if (!shareTargetRecord) return;
      setShareEmailSending(true);
      emailRecord(shareTargetRecord, email, template, format)
        .then(() => {
          saveLastShareRecipientEmail(email);
          hapticSuccess();
          handleCloseShareSheet();
          Alert.alert(t('share.emailSentTitle'), t('share.emailSentMessage', { email }));
        })
        .catch((err: unknown) => {
          hapticError();
          Alert.alert(
            t('share.emailFailedTitle'),
            err instanceof Error ? toUserFacingFetchErrorFromUnknown(err) : t('batch.exportFailed'),
          );
        })
        .finally(() => {
          setShareEmailSending(false);
        });
    },
    [emailRecord, handleCloseShareSheet, shareTargetRecord, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: FlattenedItem }) => (
      <InboxScreenListItem
        item={item}
        color={color}
        bannerMaxWidth={bannerMaxWidth}
        batchSelect={batchSelect}
        cardLayout={inboxCardLayout}
        effectiveActiveFolderId={effectiveActiveFolderId}
        foldersEnabled={foldersEnabled}
        folderColorById={folderColorById}
        folderIconById={folderIconById}
        folderNameById={folderNameById}
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
        onRecordShare={handleRecordShare}
        onOpenAllTasksForNote={handleOpenAllTasksForNote}
      />
    ),
    [
      color,
      bannerMaxWidth,
      inboxCardLayout,
      effectiveActiveFolderId,
      folderColorById,
      folderIconById,
      folderNameById,
      foldersEnabled,
      isProActive,
      isArchivedView,
      dismissSwipeHint,
      archiveRecord,
      unarchiveRecord,
      togglePin,
      handleRecordPress,
      handleStatusPress,
      handleRecordLongPress,
      handleRecordShare,
      handleOpenAllTasksForNote,
      batchSelect,
    ],
  );

  const getItemType = useCallback(
    (item: FlattenedItem) => (item.type === 'record' ? `record-${inboxCardLayout}` : item.type),
    [inboxCardLayout],
  );

  const keyExtractor = useCallback((item: FlattenedItem) => {
    if (item.type === 'header') {
      return `header-${item.title}`;
    }
    if (item.type === 'banner_card') {
      return `inbox-inline-banner-${item.slotIndex}`;
    }
    return item.item.id;
  }, []);

  const onListEndReached = useCallback(() => {
    if (!canLoadMoreInbox) return;
    setVisibleRecordCount((c) => c + INBOX_RECORD_PAGE_SIZE);
  }, [canLoadMoreInbox]);

  const batchProgressModal = useMemo(() => {
    if (!batchProgress) return null;
    const { kind, current, total } = batchProgress;
    const keys: Record<BatchProgressKind, { titleKey: string; descriptionKey: string }> = {
      archive: {
        titleKey: 'batch.progressArchivingTitle',
        descriptionKey: 'batch.progressArchivingDescription',
      },
      unarchive: {
        titleKey: 'batch.progressUnarchivingTitle',
        descriptionKey: 'batch.progressUnarchivingDescription',
      },
      delete: {
        titleKey: 'batch.progressDeletingTitle',
        descriptionKey: 'batch.progressDeletingDescription',
      },
      purgeForever: {
        titleKey: 'batch.progressPurgeForeverTitle',
        descriptionKey: 'batch.progressPurgeForeverDescription',
      },
      moveToFolder: {
        titleKey: 'batch.progressMovingTitle',
        descriptionKey: 'batch.progressMovingDescription',
      },
    };
    const k = keys[kind];
    return {
      title: t(k.titleKey),
      description: t(k.descriptionKey),
      total,
      progressLabel: t('batch.progressCounter', { current, total }),
    };
  }, [batchProgress, t]);

  const screenStyle = useMemo(
    () => ({ flex: 1, backgroundColor: color.background.primary }),
    [color.background.primary],
  );

  const listContentStyle = useMemo(
    () => ({
      paddingBottom: batchSelect.isSelectMode
        ? getInboxBatchModeScrollPaddingBottom(insets.bottom)
        : getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
      paddingTop: 0,
      backgroundColor: color.background.secondary,
    }),
    [batchSelect.isSelectMode, color.background.secondary, insets.bottom, isTablet],
  );
  const listStyle = useMemo(
    () => ({ backgroundColor: color.background.secondary }),
    [color.background.secondary],
  );

  const allSelected =
    visibleRecordIds.length > 0 && batchSelect.selectedIds.size === visibleRecordIds.length;

  useLayoutEffect(() => {
    if (useTabletShell) {
      return;
    }

    const tabNav = navigation.getParent<BottomTabNavigationProp<BottomTabParamList>>();
    if (!tabNav) {
      return;
    }

    const restoreTabBar = () => {
      tabNav.setOptions({
        tabBarStyle: buildFloatingTabBarStyle({
          insets,
          windowWidth,
          isTablet,
          shadowColor: color.shadow.color,
          shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
        }),
      });
    };

    if ((batchSelect.isSelectMode || showInboxSearchBar) && isInboxTabFocused) {
      tabNav.setOptions({
        tabBarStyle: { display: 'none' },
      });
    } else {
      restoreTabBar();
    }

    return restoreTabBar;
  }, [
    batchSelect.isSelectMode,
    showInboxSearchBar,
    isInboxTabFocused,
    navigation,
    insets,
    windowWidth,
    isTablet,
    color.shadow.color,
    color.shadow.opacity,
    useTabletShell,
  ]);

  return {
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
    subtitleText,
    headerTitle,
    headerSubtitleText,
    folderModalVisible,
    editingFolder,
    openCreateFolderModal,
    openEditFolderModal,
    closeFolderModal,
    handleFolderSave,
    handleFolderDelete,
    runAutoOrganize,
    cancelAutoOrganize,
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
    onInboxListScroll: handleInboxListScroll,
    batchProgressModal,
    isGeneratingSharePdf: isGeneratingSharePdf || isGeneratingSingleSharePdf,
    isProActive,
    inboxCardLayout,
    setInboxCardLayout,
    shareSheetVisible,
    shareTargetRecord,
    shareEmailSending,
    handleCloseShareSheet,
    handleShareRecordText,
    handleShareRecordAudio,
    handleEmailShareRecord,
  };
}
