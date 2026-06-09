import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { History, Save, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { useRootStackBack } from '@/app/navigation/useRootStackBack';
import { useFolderStore } from '@/entities/folder';
import { type TaskItem, useRecordStore } from '@/entities/record';
import { areFoldersEnabledInAiMode, useSettingsStore } from '@/entities/settings';
import { useProEntitlement } from '@/features/pro-license';
import { TaskEditSheet } from '@/screens/recording-detail/ui/TaskEditSheet';
import { useColors } from '@/shared/config';
import { EmptyState, HeaderIconButton, ScreenHeader } from '@/shared/ui';

import { collectUniqueTags, countFilteredGraphRecords } from '../lib/buildGraphModel';
import { buildNotesGraphPersistKey } from '../lib/buildNotesGraphPersistKey';
import { findGraphSearchMatchIds, type GraphSearchIndexEntry } from '../lib/graphSearch';
import { getSessionNodePositions, replaceSessionNodePositions } from '../lib/graphSessionLayout';
import { shouldAutoSimplifyGraph } from '../lib/graphSimplifyMode';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';
import { DEFAULT_EDGE_VISIBILITY, type GraphFilters } from '../lib/graphTypes';
import {
  awaitPendingNotesGraphLayout,
  buildAndCacheNotesGraphLayout,
  buildNotesGraphLayoutCacheKey,
  getCachedNotesGraphLayout,
} from '../lib/notesGraphLayoutCache';
import {
  getLatestNotesGraphLayoutVersion,
  getNotesGraphLayoutVersionPositions,
  saveNotesGraphLayoutVersion,
  serializeNotesGraphPositions,
} from '../lib/notesGraphLayoutDb';
import { GraphBuildingState } from './GraphBuildingState';
import type { GraphCanvasHandle } from './GraphCanvas';
import { GraphCanvas } from './GraphCanvas';
import { GraphFilterBar } from './GraphFilterBar';
import { GraphLayoutHistorySheet } from './GraphLayoutHistorySheet';
import { GraphStickySearchBar } from './GraphStickySearchBar';

const LARGE_GRAPH_RECORD_THRESHOLD = 150;
const GRAPH_SEARCH_DEBOUNCE_MS = 300;

export const NotesGraphScreenBody = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleBack = useRootStackBack();
  const route = useRoute<RouteProp<RootStackParamList, 'NotesGraph'>>();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const { isProActive } = useProEntitlement();
  const canvasRef = useRef<GraphCanvasHandle>(null);

  const [filters, setFilters] = useState<GraphFilters>(() => ({
    folderId: route.params?.folderId ?? null,
    tags: route.params?.tag ? [route.params.tag] : [],
    showTasks: true,
    edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
  }));

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchBarExplicitOpen, setSearchBarExplicitOpen] = useState(false);
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [simplifyOverride, setSimplifyOverride] = useState<boolean | null>(null);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<GraphEdge[]>([]);
  const [searchIndex, setSearchIndex] = useState<GraphSearchIndexEntry[]>([]);
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const [recordCount, setRecordCount] = useState(0);
  const [isBuilding, setIsBuilding] = useState(true);
  const [isGraphReconciling, setIsGraphReconciling] = useState(false);
  const [hasUnsavedLayoutChanges, setHasUnsavedLayoutChanges] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [historySheetVisible, setHistorySheetVisible] = useState(false);
  const [activeSavedVersionId, setActiveSavedVersionId] = useState<string | null>(null);
  const [layoutRestoreToken, setLayoutRestoreToken] = useState(0);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [persistHydrated, setPersistHydrated] = useState(false);
  const savedLayoutSnapshotRef = useRef('');
  const [activeSearchNodeId, setActiveSearchNodeId] = useState<string | null>(null);
  const [editTaskTarget, setEditTaskTarget] = useState<{
    recordId: string;
    taskId: string;
    text: string;
    deadline?: string | null;
    deadlineTime?: string | null;
    priority?: TaskItem['priority'];
  } | null>(null);

  const records = useRecordStore((s) => s.records);
  const updateTasks = useRecordStore((s) => s.updateTasks);

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const foldersEnabled = areFoldersEnabledInAiMode(aiExecutionMode, privateAiProvider, isProActive);

  const { folders } = useFolderStore(
    useShallow((s) => ({
      folders: s.folders,
    })),
  );

  const foldersById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const availableTags = useMemo(() => collectUniqueTags(records), [records]);

  const filteredRecordCount = useMemo(
    () => countFilteredGraphRecords(records, filters),
    [records, filters],
  );

  const simplifyActive = useMemo(
    () => simplifyOverride ?? shouldAutoSimplifyGraph(filteredRecordCount),
    [filteredRecordCount, simplifyOverride],
  );

  const toggleSimplifyMode = useCallback(() => {
    setSimplifyOverride((current) => {
      if (current === null) return !shouldAutoSimplifyGraph(filteredRecordCount);
      return !current;
    });
  }, [filteredRecordCount]);

  const layoutCacheKey = useMemo(
    () =>
      buildNotesGraphLayoutCacheKey(records, filters, simplifyOverride, windowWidth, windowHeight),
    [filters, records, simplifyOverride, windowHeight, windowWidth],
  );

  const persistKey = useMemo(
    () => buildNotesGraphPersistKey(records, filters, simplifyOverride),
    [filters, records, simplifyOverride],
  );

  const syncUnsavedLayoutState = useCallback(() => {
    const snapshot = serializeNotesGraphPositions(getSessionNodePositions());
    setHasUnsavedLayoutChanges(snapshot !== savedLayoutSnapshotRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setPersistHydrated(false);
      replaceSessionNodePositions({});

      const latest = await getLatestNotesGraphLayoutVersion(persistKey);
      if (cancelled) return;

      if (latest) {
        replaceSessionNodePositions(latest.positions);
        savedLayoutSnapshotRef.current = serializeNotesGraphPositions(getSessionNodePositions());
        setActiveSavedVersionId(latest.id);
      } else {
        savedLayoutSnapshotRef.current = serializeNotesGraphPositions(new Map());
        setActiveSavedVersionId(null);
      }

      setHasUnsavedLayoutChanges(false);
      setLayoutRestoreToken((token) => token + 1);
      setPersistHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [persistKey]);

  useEffect(() => {
    if (!persistHydrated) return;
    let cancelled = false;

    const applyBuilt = (built: {
      layoutNodes: GraphNode[];
      layoutEdges: GraphEdge[];
      graphSize: { width: number; height: number };
      recordCount: number;
      searchIndex: GraphSearchIndexEntry[];
    }) => {
      setLayoutNodes(built.layoutNodes);
      setLayoutEdges(built.layoutEdges);
      setGraphSize(built.graphSize);
      setRecordCount(built.recordCount);
      setSearchIndex(built.searchIndex);
      setIsBuilding(false);
    };

    void (async () => {
      const cached = getCachedNotesGraphLayout(layoutCacheKey);
      if (cached) {
        if (!cancelled) applyBuilt(cached);
        return;
      }

      if (!cancelled) setIsBuilding(true);

      const pending = await awaitPendingNotesGraphLayout(layoutCacheKey);
      if (cancelled) return;
      if (pending) {
        applyBuilt(pending);
        return;
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 0);
        });
      });

      if (cancelled) return;

      const built = buildAndCacheNotesGraphLayout(
        records,
        filters,
        filteredRecordCount,
        simplifyOverride,
        windowWidth,
        windowHeight,
      );

      if (!cancelled) applyBuilt(built);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    filteredRecordCount,
    filters,
    layoutCacheKey,
    persistHydrated,
    records,
    simplifyOverride,
    windowHeight,
    windowWidth,
  ]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!searchQuery.trim()) {
      setDebouncedSearchQuery(searchQuery);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, GRAPH_SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const flushDebouncedSearchQuery = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setDebouncedSearchQuery(searchQuery);
  }, [searchQuery]);

  const layoutNodesById = useMemo(
    () => new Map(layoutNodes.map((node) => [node.id, node])),
    [layoutNodes],
  );

  const searchMatchIds = useMemo(
    () => findGraphSearchMatchIds(searchIndex, debouncedSearchQuery),
    [debouncedSearchQuery, searchIndex],
  );

  const searchMatches = useMemo(
    () =>
      searchMatchIds
        .map((id) => layoutNodesById.get(id))
        .filter((node): node is GraphNode => node != null),
    [layoutNodesById, searchMatchIds],
  );

  const matchedNodeIds = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return null;
    return new Set(searchMatchIds);
  }, [debouncedSearchQuery, searchMatchIds]);

  const handleFiltersChange = useCallback((patch: Partial<GraphFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const showGraphSearchBar =
    records.length > 0 && (searchBarExplicitOpen || searchQuery.trim().length > 0);

  const handleSearchHeaderPress = useCallback(() => {
    if (isGraphReconciling) return;
    const barVisible = searchBarExplicitOpen || searchQuery.trim().length > 0;
    if (barVisible && searchQuery.trim() === '') {
      setSearchBarExplicitOpen(false);
    } else {
      setSearchBarExplicitOpen(true);
      setSearchFocusSignal((n) => n + 1);
    }
  }, [isGraphReconciling, searchBarExplicitOpen, searchQuery]);

  const handleSearchCleared = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSearchBarExplicitOpen(false);
    setSearchMatchIndex(0);
    setActiveSearchNodeId(null);
  }, []);

  useEffect(() => {
    setSearchMatchIndex(0);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (searchMatches.length === 0) {
      setActiveSearchNodeId(null);
      return;
    }
    const safeIndex =
      ((searchMatchIndex % searchMatches.length) + searchMatches.length) % searchMatches.length;
    setActiveSearchNodeId(searchMatches[safeIndex]?.id ?? null);
  }, [searchMatchIndex, searchMatches]);

  const resolveSearchMatches = useCallback(
    (query: string) => {
      const ids = findGraphSearchMatchIds(searchIndex, query);
      return ids
        .map((id) => layoutNodesById.get(id))
        .filter((node): node is GraphNode => node != null);
    },
    [layoutNodesById, searchIndex],
  );

  const focusSearchMatchAt = useCallback(
    (index: number, query = debouncedSearchQuery) => {
      const matches = resolveSearchMatches(query);
      if (matches.length === 0) return;
      const wrapped = ((index % matches.length) + matches.length) % matches.length;
      setSearchMatchIndex(wrapped);
      const active = matches[wrapped];
      if (active) {
        canvasRef.current?.focusNode(active);
      }
    },
    [debouncedSearchQuery, resolveSearchMatches],
  );

  const handleSearchSubmit = useCallback(() => {
    flushDebouncedSearchQuery();
    focusSearchMatchAt(searchMatchIndex, searchQuery);
  }, [flushDebouncedSearchQuery, focusSearchMatchAt, searchMatchIndex, searchQuery]);

  const handleSearchPrevious = useCallback(() => {
    flushDebouncedSearchQuery();
    focusSearchMatchAt(searchMatchIndex - 1, searchQuery);
  }, [flushDebouncedSearchQuery, focusSearchMatchAt, searchMatchIndex, searchQuery]);

  const handleSearchNext = useCallback(() => {
    flushDebouncedSearchQuery();
    focusSearchMatchAt(searchMatchIndex + 1, searchQuery);
  }, [flushDebouncedSearchQuery, focusSearchMatchAt, searchMatchIndex, searchQuery]);

  const handleRecordPress = useCallback(
    (recordId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (record) {
        navigation.navigate('RecordingDetail', { record });
      }
    },
    [navigation, records],
  );

  const handleTaskPress = useCallback(
    (recordId: string, taskId: string) => {
      const record = records.find((r) => r.id === recordId);
      const task = record?.tasks?.find((item) => item.id === taskId);
      if (!task) return;
      setEditTaskTarget({
        recordId,
        taskId,
        text: task.text,
        deadline: task.deadline,
        deadlineTime: task.deadlineTime,
        priority: task.priority,
      });
    },
    [records],
  );

  const handleSaveTask = useCallback(
    (value: {
      text: string;
      deadline?: string | null;
      deadlineTime?: string | null;
      priority?: TaskItem['priority'];
    }) => {
      if (!editTaskTarget) return false;
      const record = records.find((r) => r.id === editTaskTarget.recordId);
      if (!record) return false;

      const nextTasks = (record.tasks ?? []).map((task) =>
        task.id === editTaskTarget.taskId
          ? {
              ...task,
              text: value.text,
              deadline: value.deadline,
              deadlineTime: value.deadlineTime,
              priority: value.priority,
            }
          : task,
      );
      void updateTasks(editTaskTarget.recordId, nextTasks);
      setEditTaskTarget(null);
      return true;
    },
    [editTaskTarget, records, updateTasks],
  );

  const showLargeGraphHint = !isBuilding && filteredRecordCount > LARGE_GRAPH_RECORD_THRESHOLD;

  const handleLayoutPositionsChange = useCallback(() => {
    syncUnsavedLayoutState();
  }, [syncUnsavedLayoutState]);

  const handleSaveLayout = useCallback(async () => {
    if (isSavingLayout || isGraphReconciling || !hasUnsavedLayoutChanges) return;

    setIsSavingLayout(true);
    try {
      const positions = getSessionNodePositions();
      const entry = await saveNotesGraphLayoutVersion(persistKey, positions);
      savedLayoutSnapshotRef.current = serializeNotesGraphPositions(positions);
      setHasUnsavedLayoutChanges(false);
      setActiveSavedVersionId(entry.id);
      setHistoryRefreshToken((token) => token + 1);
    } finally {
      setIsSavingLayout(false);
    }
  }, [hasUnsavedLayoutChanges, isGraphReconciling, isSavingLayout, persistKey]);

  const handleRestoreLayoutVersion = useCallback(
    async (versionId: string) => {
      const positions = await getNotesGraphLayoutVersionPositions(versionId);
      if (!positions) return;

      replaceSessionNodePositions(positions);
      setLayoutRestoreToken((token) => token + 1);
      syncUnsavedLayoutState();
    },
    [syncUnsavedLayoutState],
  );

  const headerControlsDisabled = isGraphReconciling || isSavingLayout;

  const headerRightSlot =
    recordCount > 0 ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          opacity: headerControlsDisabled ? 0.45 : 1,
        }}
        pointerEvents={headerControlsDisabled ? 'none' : 'auto'}
      >
        {hasUnsavedLayoutChanges ? (
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<Save size={21} color={color.accent.primary} strokeWidth={2.2} />}
            color={color}
            onPress={() => {
              void handleSaveLayout();
            }}
            accessibilityLabel={t('notesGraph.saveChangesA11y')}
          />
        ) : null}
        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<History size={21} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={() => setHistorySheetVisible(true)}
          accessibilityLabel={t('notesGraph.history.openA11y')}
        />
        {records.length > 0 ? (
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={
              <Search
                size={21}
                color={
                  searchBarExplicitOpen || searchQuery.trim().length > 0
                    ? color.accent.primary
                    : color.text.primary
                }
                strokeWidth={2.2}
              />
            }
            color={color}
            onPress={handleSearchHeaderPress}
            accessibilityLabel={
              !showGraphSearchBar
                ? t('search.a11yOpen')
                : searchQuery.trim() === ''
                  ? t('search.a11yHide')
                  : t('search.a11yFocus')
            }
          />
        ) : null}
      </View>
    ) : null;

  if (isBuilding || !persistHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
        <ScreenHeader title={t('notesGraph.title')} onBack={handleBack} />
        <GraphBuildingState label={t('notesGraph.building')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('notesGraph.title')} onBack={handleBack} rightSlot={headerRightSlot} />

      <GraphFilterBar
        color={color}
        filters={filters}
        folders={folders}
        foldersEnabled={foldersEnabled}
        isProActive={isProActive}
        availableTags={availableTags}
        disabled={isGraphReconciling}
        onFiltersChange={handleFiltersChange}
      />

      {showLargeGraphHint ? (
        <Pressable
          onPress={toggleSimplifyMode}
          disabled={isGraphReconciling}
          accessibilityRole="button"
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: color.background.tertiary,
            opacity: isGraphReconciling ? 0.55 : 1,
          }}
        >
          <Text style={{ color: color.text.secondary, fontSize: 13 }}>
            {simplifyActive ? t('notesGraph.simplifyActiveHint') : t('notesGraph.largeGraphHint')}
          </Text>
        </Pressable>
      ) : null}

      {recordCount === 0 ? (
        <EmptyState
          title={t('notesGraph.emptyTitle')}
          description={t('notesGraph.emptyDescription')}
        />
      ) : (
        <GraphCanvas
          ref={canvasRef}
          nodes={layoutNodes}
          edges={layoutEdges}
          graphWidth={graphSize.width}
          graphHeight={graphSize.height}
          color={color}
          foldersById={foldersById}
          isProActive={isProActive}
          matchedNodeIds={matchedNodeIds}
          activeNodeId={activeSearchNodeId}
          bottomInset={insets.bottom}
          onRecordPress={handleRecordPress}
          onTaskPress={handleTaskPress}
          onReconcilingChange={setIsGraphReconciling}
          onLayoutPositionsChange={handleLayoutPositionsChange}
          layoutRestoreToken={layoutRestoreToken}
        />
      )}

      <TaskEditSheet
        visible={editTaskTarget != null}
        initialText={editTaskTarget?.text ?? ''}
        initialDeadline={editTaskTarget?.deadline}
        initialDeadlineTime={editTaskTarget?.deadlineTime}
        initialPriority={editTaskTarget?.priority}
        showMetadataFields
        onClose={() => setEditTaskTarget(null)}
        onSave={handleSaveTask}
        sheetTitleKey="recordingDetail.editTask"
      />

      <GraphLayoutHistorySheet
        visible={historySheetVisible}
        layoutKey={persistKey}
        activeVersionId={hasUnsavedLayoutChanges ? null : activeSavedVersionId}
        refreshToken={historyRefreshToken}
        onClose={() => setHistorySheetVisible(false)}
        onRestore={(versionId) => {
          void handleRestoreLayoutVersion(versionId);
        }}
      />

      {showGraphSearchBar ? (
        <KeyboardStickyView
          offset={{ closed: -insets.bottom, opened: 0 }}
          pointerEvents={isGraphReconciling ? 'none' : 'auto'}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            opacity: isGraphReconciling ? 0.55 : 1,
          }}
        >
          <GraphStickySearchBar
            query={searchQuery}
            debouncedQuery={debouncedSearchQuery}
            onChangeQuery={setSearchQuery}
            onSubmit={handleSearchSubmit}
            matchCount={searchMatches.length}
            matchIndex={searchMatches.length > 0 ? searchMatchIndex : null}
            onPreviousMatch={handleSearchPrevious}
            onNextMatch={handleSearchNext}
            color={color}
            focusSignal={searchFocusSignal}
            insetsBottom={insets.bottom}
            onClose={handleSearchCleared}
          />
        </KeyboardStickyView>
      ) : null}
    </View>
  );
};
