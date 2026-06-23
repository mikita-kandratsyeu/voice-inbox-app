import { MenuView } from '@react-native-menu/menu';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box, MoreVertical, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { useRootStackBack } from '@/app/navigation/useRootStackBack';
import { useFolderStore } from '@/entities/folder';
import { type TaskItem, useRecordStore } from '@/entities/record';
import { areFoldersEnabledInAiMode, useSettingsStore } from '@/entities/settings';
import { useProEntitlement } from '@/features/pro-license';
import { TaskEditSheet } from '@/screens/recording-detail/ui/TaskEditSheet';
import { useAppTheme, useColors } from '@/shared/config';
import { hapticSelection, inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';
import {
  EmptyState,
  FloatingFrostedStickyView,
  FrostedHeaderButtonGroup,
  HeaderIconButton,
  ScreenHeader,
} from '@/shared/ui';

import {
  collectUniqueTags,
  countFilteredGraphRecords,
  MAX_RECORDS_FOR_SIMILAR_EDGES,
} from '../lib/buildGraphModel';
import { buildLocalGraphFilters, resolveLocalGraphDepth } from '../lib/buildLocalGraphFilters';
import { buildLocalGraphNeighborhood } from '../lib/buildLocalGraphNeighborhood';
import { buildNotesGraphPersistKey } from '../lib/buildNotesGraphPersistKey';
import { formatGraphAppliedLayoutHeaderSubtitle } from '../lib/formatGraphAppliedLayoutHeaderSubtitle';
import { getGraphShowArchived, setGraphShowArchived } from '../lib/graphArchivePreferences';
import {
  GRAPH_EXPORT_DEFAULT_BACKGROUND_ID,
  type GraphExportBackgroundId,
} from '../lib/graphExportBackground';
import {
  getGraphFolderHighlightsVisible,
  setGraphFolderHighlightsVisible,
} from '../lib/graphFolderHighlightsPreferences';
import {
  GRAPH_LAYOUT_TRANSITION_MS,
  GRAPH_LAYOUT_UPDATE_MIN_MS,
  runLayoutTransition,
  shouldAnimateLayoutTransition,
} from '../lib/graphLayoutTransition';
import {
  getGraphMinimapVisible,
  isGraphMinimapAvailable,
  setGraphMinimapVisible,
} from '../lib/graphMinimapPreferences';
import {
  getGraphNodeDisplayMode,
  setGraphNodeDisplayMode,
} from '../lib/graphNodeDisplayModePreferences';
import { findGraphSearchMatchIds, type GraphSearchIndexEntry } from '../lib/graphSearch';
import {
  clearGraphSessionLayout,
  getSessionNodePositions,
  replaceSessionNodePositions,
} from '../lib/graphSessionLayout';
import { shouldAutoSimplifyGraph } from '../lib/graphSimplifyMode';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';
import {
  DEFAULT_EDGE_VISIBILITY,
  DEFAULT_GRAPH_LAYOUT_MODE,
  type GraphFilters,
  recordNodeId,
  taskNodeId,
} from '../lib/graphTypes';
import {
  estimateGraphSearchFocusBottomInset,
  shouldShowGraphSearchMatchLabel,
} from '../lib/graphViewportInsets';
import type { NotesGraphHistoryScope } from '../lib/notesGraphHistoryScope';
import {
  awaitPendingNotesGraphLayout,
  buildAndCacheNotesGraphLayoutAsync,
  buildNotesGraphLayoutCacheKey,
  clearNotesGraphLayoutCache,
  getCachedNotesGraphLayout,
} from '../lib/notesGraphLayoutCache';
import {
  deleteNotesGraphLayoutHistoryByScope,
  deleteNotesGraphLayoutVersionById,
  deserializeNotesGraphPositions,
  getLatestNotesGraphLayoutVersion,
  getNotesGraphLayoutVersionPositions,
  type NotesGraphLayoutVersionEntry,
  saveNotesGraphLayoutVersion,
  serializeNotesGraphPositions,
} from '../lib/notesGraphLayoutDb';
import {
  parsedPersistKeyToGraphFilters,
  parseNotesGraphPersistKey,
} from '../lib/parseNotesGraphPersistKey';
import { GraphBuildingState } from './GraphBuildingState';
import type { GraphCanvasHandle } from './GraphCanvas';
import { GraphCanvas } from './GraphCanvas';
import { GraphCanvas3D } from './GraphCanvas3D';
import { GraphExportPreviewSheet } from './GraphExportPreviewSheet';
import { GraphFilterBar } from './GraphFilterBar';
import { GraphLayoutHistorySheet } from './GraphLayoutHistorySheet';
import { GraphLayoutSaveSheet } from './GraphLayoutSaveSheet';
import { GraphStickySearchBar } from './GraphStickySearchBar';

const LARGE_GRAPH_RECORD_THRESHOLD = 80;
const GRAPH_SEARCH_DEBOUNCE_MS = 300;

type GraphViewMode = '2d' | '3d';

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

const GRAPH_SEARCH_MATCH_INDEX_NONE = -1;

export const NotesGraphScreenBody = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleBack = useRootStackBack();
  const route = useRoute<RouteProp<RootStackParamList, 'NotesGraph'>>();
  const color = useColors();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const { isProActive } = useProEntitlement();
  const focusRecordId = route.params?.focusRecordId;
  const localDepth = resolveLocalGraphDepth(route.params?.localDepth);
  const isLocalGraphMode = Boolean(focusRecordId);
  const canvasRef = useRef<GraphCanvasHandle>(null);
  const hasFocusedLocalNodeRef = useRef(false);

  const [filters, setFilters] = useState<GraphFilters>(() => {
    if (route.params?.focusRecordId) {
      return buildLocalGraphFilters();
    }

    return {
      folderIds: route.params?.folderId ? [route.params.folderId] : [],
      tags: route.params?.tag ? [route.params.tag] : [],
      showTasks: true,
      showCompletedTasks: true,
      showArchived: getGraphShowArchived(),
      edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
      layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
      nodeDisplayMode: getGraphNodeDisplayMode(),
    };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchBarExplicitOpen, setSearchBarExplicitOpen] = useState(false);
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [simplifyOverride, setSimplifyOverride] = useState<boolean | null>(null);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>([]);
  const [displayNodes, setDisplayNodes] = useState<GraphNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<GraphEdge[]>([]);
  const [searchIndex, setSearchIndex] = useState<GraphSearchIndexEntry[]>([]);
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const [recordCount, setRecordCount] = useState(0);
  const [isBuilding, setIsBuilding] = useState(true);
  const [buildProgress, setBuildProgress] = useState<number | null>(null);
  const [isLayoutTransitioning, setIsLayoutTransitioning] = useState(false);
  const [isGraphReconciling, setIsGraphReconciling] = useState(false);
  const [hasUnsavedLayoutChanges, setHasUnsavedLayoutChanges] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [historySheetVisible, setHistorySheetVisible] = useState(false);
  const [layoutSaveSheetVisible, setLayoutSaveSheetVisible] = useState(false);
  const [exportSheetVisible, setExportSheetVisible] = useState(false);
  const [exportPreviewReady, setExportPreviewReady] = useState(false);
  const [exportPreviewUri, setExportPreviewUri] = useState<string | null>(null);
  const [exportPreviewSize, setExportPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isCapturingExport, setIsCapturingExport] = useState(false);
  const [isExportCaptureMount, setIsExportCaptureMount] = useState(false);
  const [exportCaptureBackgroundId, setExportCaptureBackgroundId] =
    useState<GraphExportBackgroundId>(GRAPH_EXPORT_DEFAULT_BACKGROUND_ID);
  const [folderHighlightsVisible, setFolderHighlightsVisible] = useState(() =>
    getGraphFolderHighlightsVisible(),
  );
  const [minimapVisible, setMinimapVisible] = useState(() => getGraphMinimapVisible());
  const [nodeDisplayMode, setNodeDisplayMode] = useState(() => getGraphNodeDisplayMode());
  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>('2d');
  const exportCaptureTokenRef = useRef(0);
  const exportPreviewBackgroundIdRef = useRef<GraphExportBackgroundId>(
    GRAPH_EXPORT_DEFAULT_BACKGROUND_ID,
  );
  const layoutNodesRef = useRef<GraphNode[]>([]);
  const layoutTransitionCancelRef = useRef<(() => void) | null>(null);
  const layoutUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildProgressPercentRef = useRef(-1);
  const [activeSavedVersion, setActiveSavedVersion] = useState<NotesGraphLayoutVersionEntry | null>(
    null,
  );
  const [layoutRestoreToken, setLayoutRestoreToken] = useState(0);
  const [nodePositionRevision, setNodePositionRevision] = useState(0);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [layoutApplyRequestId, setLayoutApplyRequestId] = useState(0);
  const [persistHydrated, setPersistHydrated] = useState(false);
  const savedLayoutSnapshotRef = useRef('');
  const pendingLayoutApplyVersionRef = useRef<NotesGraphLayoutVersionEntry | null>(null);
  const shouldFitAfterLayoutApplyRef = useRef(false);
  const [activeSearchNodeId, setActiveSearchNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [editTaskTarget, setEditTaskTarget] = useState<{
    recordId: string;
    taskId: string;
    text: string;
    deadline?: string | null;
    deadlineTime?: string | null;
    priority?: TaskItem['priority'];
  } | null>(null);

  const isGraphMapBusy = isBuilding || isLayoutTransitioning || isGraphReconciling;
  const graphMapStatusLabel = isGraphReconciling
    ? t('notesGraph.reconciling')
    : t('notesGraph.building');
  const showFullScreenBuilding = (isBuilding || !persistHydrated) && layoutNodes.length === 0;

  const records = useRecordStore((s) => s.records);
  const updateTasks = useRecordStore((s) => s.updateTasks);

  const localNeighborhood = useMemo(() => {
    if (!focusRecordId) return null;

    return buildLocalGraphNeighborhood(focusRecordId, records, {
      maxHops: localDepth,
      includeSimilar: true,
      similarLimitPerHop: 3,
    });
  }, [focusRecordId, localDepth, records]);

  const graphRecords = useMemo(() => {
    if (!localNeighborhood) return records;

    const recordsById = new Map(records.map((record) => [record.id, record]));
    return localNeighborhood.recordIds
      .map((recordId) => recordsById.get(recordId))
      .filter((record): record is NonNullable<typeof record> => record != null);
  }, [localNeighborhood, records]);

  const focusRecordTitle = useMemo(() => {
    if (!focusRecordId) return null;
    return records.find((record) => record.id === focusRecordId)?.title ?? null;
  }, [focusRecordId, records]);

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const foldersEnabled = areFoldersEnabledInAiMode(aiExecutionMode, privateAiProvider, isProActive);

  const { folders } = useFolderStore(
    useShallow((s) => ({
      folders: s.folders,
    })),
  );

  const foldersById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const availableTags = useMemo(() => collectUniqueTags(graphRecords), [graphRecords]);

  const filteredRecordCount = useMemo(
    () => countFilteredGraphRecords(graphRecords, filters),
    [graphRecords, filters],
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

  const historyScope = useMemo<NotesGraphHistoryScope>(
    () => (focusRecordId ? { kind: 'local', focusRecordId } : { kind: 'global' }),
    [focusRecordId],
  );

  const layoutCacheKey = useMemo(
    () =>
      buildNotesGraphLayoutCacheKey(
        graphRecords,
        filters,
        simplifyOverride,
        windowWidth,
        windowHeight,
      ),
    [filters, graphRecords, simplifyOverride, windowHeight, windowWidth],
  );

  const persistKey = useMemo(
    () => buildNotesGraphPersistKey(graphRecords, filters, simplifyOverride, historyScope),
    [filters, graphRecords, historyScope, simplifyOverride],
  );

  const syncUnsavedLayoutState = useCallback(() => {
    const snapshot = serializeNotesGraphPositions(getSessionNodePositions());
    setHasUnsavedLayoutChanges(snapshot !== savedLayoutSnapshotRef.current);
  }, []);

  useEffect(() => {
    return () => {
      layoutTransitionCancelRef.current?.();
      layoutTransitionCancelRef.current = null;
      clearGraphSessionLayout();
      clearNotesGraphLayoutCache();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setPersistHydrated(false);
      replaceSessionNodePositions({});

      const pendingVersion = pendingLayoutApplyVersionRef.current;
      if (pendingVersion) {
        pendingLayoutApplyVersionRef.current = null;
        const positions = await getNotesGraphLayoutVersionPositions(pendingVersion.id);
        if (cancelled) return;

        if (positions) {
          replaceSessionNodePositions(positions);
          savedLayoutSnapshotRef.current = serializeNotesGraphPositions(getSessionNodePositions());
          setActiveSavedVersion(pendingVersion);
        } else {
          savedLayoutSnapshotRef.current = serializeNotesGraphPositions(new Map());
          setActiveSavedVersion(null);
        }
      } else {
        const latest = await getLatestNotesGraphLayoutVersion(persistKey);
        if (cancelled) return;

        if (latest) {
          replaceSessionNodePositions(latest.positions);
          savedLayoutSnapshotRef.current = serializeNotesGraphPositions(getSessionNodePositions());
          setActiveSavedVersion({
            id: latest.id,
            layoutKey: latest.layoutKey,
            versionNumber: latest.versionNumber,
            createdAt: latest.createdAt,
            nodeCount: latest.nodeCount,
            name: latest.name,
          });
        } else {
          savedLayoutSnapshotRef.current = serializeNotesGraphPositions(new Map());
          setActiveSavedVersion(null);
        }
      }

      setHasUnsavedLayoutChanges(false);
      setLayoutRestoreToken((token) => token + 1);
      setPersistHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [layoutApplyRequestId, persistKey]);

  useEffect(() => {
    if (!persistHydrated) return;
    let cancelled = false;
    const hadVisibleGraph = layoutNodesRef.current.length > 0;

    if (hadVisibleGraph) {
      setIsBuilding(true);
    }

    const clearLayoutUpdateTimeout = () => {
      if (layoutUpdateTimeoutRef.current) {
        clearTimeout(layoutUpdateTimeoutRef.current);
        layoutUpdateTimeoutRef.current = null;
      }
    };

    const finishLayoutUpdate = () => {
      setIsLayoutTransitioning(false);
      clearLayoutUpdateTimeout();
    };

    const scheduleLayoutUpdateMinimum = () => {
      setIsLayoutTransitioning(true);
      clearLayoutUpdateTimeout();
      layoutUpdateTimeoutRef.current = setTimeout(() => {
        layoutUpdateTimeoutRef.current = null;
        if (!cancelled) finishLayoutUpdate();
      }, GRAPH_LAYOUT_UPDATE_MIN_MS);
    };

    const applyBuilt = (built: {
      layoutNodes: GraphNode[];
      layoutEdges: GraphEdge[];
      graphSize: { width: number; height: number };
      recordCount: number;
      searchIndex: GraphSearchIndexEntry[];
    }) => {
      const previousNodes = layoutNodesRef.current;
      const nextNodes = built.layoutNodes;

      setLayoutEdges(built.layoutEdges);
      setGraphSize(built.graphSize);
      setRecordCount(built.recordCount);
      setSearchIndex(built.searchIndex);
      setIsBuilding(false);
      setBuildProgress(null);
      buildProgressPercentRef.current = -1;

      layoutTransitionCancelRef.current?.();
      layoutTransitionCancelRef.current = null;
      clearLayoutUpdateTimeout();

      const finishApply = () => {
        layoutNodesRef.current = nextNodes;
        setLayoutNodes(nextNodes);
        setDisplayNodes(nextNodes);
      };

      if (shouldAnimateLayoutTransition(previousNodes, nextNodes)) {
        setIsLayoutTransitioning(true);
        layoutTransitionCancelRef.current = runLayoutTransition(
          previousNodes,
          nextNodes,
          GRAPH_LAYOUT_TRANSITION_MS,
          setDisplayNodes,
          () => {
            finishApply();
            if (!cancelled) finishLayoutUpdate();
          },
        );
        return;
      }

      finishApply();
      if (hadVisibleGraph) {
        scheduleLayoutUpdateMinimum();
      } else {
        finishLayoutUpdate();
      }
    };

    void (async () => {
      const cached = getCachedNotesGraphLayout(layoutCacheKey);
      if (cached) {
        if (!cancelled) applyBuilt(cached);
        return;
      }

      if (!cancelled) {
        setIsBuilding(true);
        setBuildProgress(0);
        buildProgressPercentRef.current = -1;
      }

      const pending = await awaitPendingNotesGraphLayout(layoutCacheKey);
      if (cancelled) return;
      if (pending) {
        applyBuilt(pending);
        return;
      }

      if (cancelled) return;

      const built = await buildAndCacheNotesGraphLayoutAsync(
        graphRecords,
        filters,
        filteredRecordCount,
        simplifyOverride,
        windowWidth,
        windowHeight,
        (progress) => {
          if (cancelled) return;
          const percent = Math.round(progress * 100);
          if (percent === buildProgressPercentRef.current) return;
          buildProgressPercentRef.current = percent;
          setBuildProgress(progress);
        },
      );

      if (!cancelled) applyBuilt(built);
    })();

    return () => {
      cancelled = true;
      layoutTransitionCancelRef.current?.();
      layoutTransitionCancelRef.current = null;
      clearLayoutUpdateTimeout();
      setIsLayoutTransitioning(false);
    };
  }, [
    filteredRecordCount,
    filters,
    layoutCacheKey,
    persistHydrated,
    graphRecords,
    simplifyOverride,
    windowHeight,
    windowWidth,
  ]);

  useEffect(() => {
    hasFocusedLocalNodeRef.current = false;
  }, [focusRecordId, layoutCacheKey]);

  useEffect(() => {
    if (graphViewMode !== '2d') return;
    if (!isLocalGraphMode || !focusRecordId || isGraphMapBusy || layoutNodes.length === 0) return;
    if (hasFocusedLocalNodeRef.current) return;

    const centerNode = layoutNodes.find((node) => node.record?.id === focusRecordId);
    if (!centerNode) return;

    hasFocusedLocalNodeRef.current = true;

    void waitForNextFrame().then(() => {
      canvasRef.current?.focusNode(centerNode);
    });
  }, [focusRecordId, graphViewMode, isGraphMapBusy, isLocalGraphMode, layoutNodes]);

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

  const sessionLayoutRevision = layoutRestoreToken + nodePositionRevision;
  const layoutNodesById = useMemo(() => {
    void sessionLayoutRevision;
    const session = getSessionNodePositions();
    const merged = layoutNodes.map((node) => {
      const pos = session.get(node.id);
      return pos ? { ...node, x: pos.x, y: pos.y } : node;
    });
    return new Map(merged.map((node) => [node.id, node]));
  }, [layoutNodes, sessionLayoutRevision]);

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

  const resolvedActiveNodeId = activeSearchNodeId ?? focusedNodeId;

  const handleFiltersChange = useCallback((patch: Partial<GraphFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const showGraphSearchBar =
    graphViewMode === '2d' &&
    records.length > 0 &&
    (searchBarExplicitOpen || searchQuery.trim().length > 0);

  const showGraphSearchMatchLabel = shouldShowGraphSearchMatchLabel({
    query: searchQuery,
    debouncedQuery: debouncedSearchQuery,
    matchCount: searchMatches.length,
    matchIndex: searchMatches.length > 0 && searchMatchIndex >= 0 ? searchMatchIndex : null,
  });

  const searchFocusBottomInset = useMemo(
    () =>
      estimateGraphSearchFocusBottomInset({
        searchBarVisible: showGraphSearchBar,
        safeAreaBottom: insets.bottom,
        showMatchLabel: showGraphSearchMatchLabel,
      }),
    [insets.bottom, showGraphSearchBar, showGraphSearchMatchLabel],
  );

  const focusViewportInsets = useMemo(
    () => ({ bottom: searchFocusBottomInset, top: 12 }),
    [searchFocusBottomInset],
  );

  const handleSearchHeaderPress = useCallback(() => {
    if (isGraphMapBusy) return;
    const barVisible = searchBarExplicitOpen || searchQuery.trim().length > 0;
    if (barVisible && searchQuery.trim() === '') {
      setSearchBarExplicitOpen(false);
    } else {
      setSearchBarExplicitOpen(true);
      setSearchFocusSignal((n) => n + 1);
    }
  }, [isGraphMapBusy, searchBarExplicitOpen, searchQuery]);

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
    if (searchMatches.length === 0 || searchMatchIndex < 0) {
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
      if (active && graphViewMode === '2d') {
        canvasRef.current?.focusNode(active);
      }
    },
    [debouncedSearchQuery, graphViewMode, resolveSearchMatches],
  );

  const focusSearchMatchAtRef = useRef(focusSearchMatchAt);
  focusSearchMatchAtRef.current = focusSearchMatchAt;

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) return;
    focusSearchMatchAtRef.current(0, debouncedSearchQuery);
  }, [debouncedSearchQuery]);

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

  const handleNodeFocus = useCallback((nodeId: string) => {
    setFocusedNodeId(nodeId);
  }, []);

  const handleClearNodeSelection = useCallback(() => {
    setFocusedNodeId(null);
    setActiveSearchNodeId(null);
    setSearchMatchIndex(GRAPH_SEARCH_MATCH_INDEX_NONE);
  }, []);

  const handleRecordPress = useCallback(
    (recordId: string) => {
      setFocusedNodeId(recordNodeId(recordId));
      const record = records.find((r) => r.id === recordId);
      if (record) {
        navigation.navigate('RecordingDetail', { record });
      }
    },
    [navigation, records],
  );

  const handleTaskPress = useCallback(
    (recordId: string, taskId: string) => {
      setFocusedNodeId(taskNodeId(recordId, taskId));
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

  const editTaskRecord = useMemo(
    () =>
      editTaskTarget ? records.find((record) => record.id === editTaskTarget.recordId) : undefined,
    [editTaskTarget, records],
  );

  const editTaskSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={editTaskTarget != null}
        initialText={editTaskTarget?.text ?? ''}
        initialDeadline={editTaskTarget?.deadline}
        initialDeadlineTime={editTaskTarget?.deadlineTime}
        initialPriority={editTaskTarget?.priority}
        showMetadataFields={editTaskRecord?.status !== 'archived'}
        onClose={() => setEditTaskTarget(null)}
        onSave={handleSaveTask}
      />
    ),
    [editTaskRecord?.status, editTaskTarget, handleSaveTask],
  );

  const showLargeGraphHint = !isGraphMapBusy && filteredRecordCount > LARGE_GRAPH_RECORD_THRESHOLD;
  const showSimilarEdgesLimitedHint =
    !isGraphMapBusy &&
    filters.edgeVisibility.similar &&
    filteredRecordCount > MAX_RECORDS_FOR_SIMILAR_EDGES;

  const handleLayoutPositionsChange = useCallback(() => {
    syncUnsavedLayoutState();
    setNodePositionRevision((revision) => revision + 1);
  }, [syncUnsavedLayoutState]);

  const handleDiscardUnsavedLayoutChanges = useCallback(() => {
    if (!hasUnsavedLayoutChanges || isGraphMapBusy || isSavingLayout) return;

    const positions = deserializeNotesGraphPositions(savedLayoutSnapshotRef.current);
    replaceSessionNodePositions(positions);
    setLayoutRestoreToken((token) => token + 1);
    syncUnsavedLayoutState();
    handleClearNodeSelection();
  }, [
    handleClearNodeSelection,
    hasUnsavedLayoutChanges,
    isGraphMapBusy,
    isSavingLayout,
    syncUnsavedLayoutState,
  ]);

  const handleOpenLayoutSaveSheet = useCallback(() => {
    if (isSavingLayout || isGraphMapBusy || !hasUnsavedLayoutChanges) return;
    setLayoutSaveSheetVisible(true);
  }, [hasUnsavedLayoutChanges, isGraphMapBusy, isSavingLayout]);

  const handleCancelLayoutSaveSheet = useCallback(() => {
    setLayoutSaveSheetVisible(false);
  }, []);

  const handleConfirmLayoutSave = useCallback(
    async (name: string) => {
      if (isSavingLayout || isGraphMapBusy || !hasUnsavedLayoutChanges) return;

      setIsSavingLayout(true);
      try {
        const positions = getSessionNodePositions();
        const entry = await saveNotesGraphLayoutVersion(persistKey, positions, name);
        savedLayoutSnapshotRef.current = serializeNotesGraphPositions(positions);
        setHasUnsavedLayoutChanges(false);
        setActiveSavedVersion(entry);
        setHistoryRefreshToken((token) => token + 1);
        setLayoutSaveSheetVisible(false);
        handleClearNodeSelection();
      } finally {
        setIsSavingLayout(false);
      }
    },
    [handleClearNodeSelection, hasUnsavedLayoutChanges, isGraphMapBusy, isSavingLayout, persistKey],
  );

  const handleApplyLayoutVersion = useCallback(async (entry: NotesGraphLayoutVersionEntry) => {
    const parsed = parseNotesGraphPersistKey(entry.layoutKey);
    if (!parsed) return;

    shouldFitAfterLayoutApplyRef.current = true;
    pendingLayoutApplyVersionRef.current = entry;
    setFilters({
      ...parsedPersistKeyToGraphFilters(parsed),
      showArchived: getGraphShowArchived(),
      nodeDisplayMode: getGraphNodeDisplayMode(),
    });
    setNodeDisplayMode(getGraphNodeDisplayMode());
    setSimplifyOverride(parsed.simplifyOverride);
    setLayoutApplyRequestId((id) => id + 1);
  }, []);

  useEffect(() => {
    if (!shouldFitAfterLayoutApplyRef.current) return;
    if (
      isBuilding ||
      isLayoutTransitioning ||
      !persistHydrated ||
      isGraphReconciling ||
      recordCount === 0
    )
      return;

    shouldFitAfterLayoutApplyRef.current = false;
    if (graphViewMode !== '2d') {
      return;
    }

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        canvasRef.current?.fitToScreen();
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [
    isBuilding,
    isLayoutTransitioning,
    isGraphReconciling,
    layoutRestoreToken,
    layoutNodes.length,
    persistHydrated,
    recordCount,
    graphViewMode,
  ]);

  const handleDeleteLayoutVersion = useCallback(
    async (versionId: string) => {
      const deleted = await deleteNotesGraphLayoutVersionById(versionId);
      if (!deleted) return;

      if (activeSavedVersion?.id === versionId) {
        const latest = await getLatestNotesGraphLayoutVersion(persistKey);
        if (latest) {
          replaceSessionNodePositions(latest.positions);
          setActiveSavedVersion({
            id: latest.id,
            layoutKey: latest.layoutKey,
            versionNumber: latest.versionNumber,
            createdAt: latest.createdAt,
            nodeCount: latest.nodeCount,
            name: latest.name,
          });
          savedLayoutSnapshotRef.current = serializeNotesGraphPositions(
            new Map(Object.entries(latest.positions)),
          );
        } else {
          replaceSessionNodePositions({});
          setActiveSavedVersion(null);
          savedLayoutSnapshotRef.current = serializeNotesGraphPositions(new Map());
        }
        setLayoutRestoreToken((token) => token + 1);
        syncUnsavedLayoutState();
      }

      setHistoryRefreshToken((token) => token + 1);
    },
    [activeSavedVersion?.id, persistKey, syncUnsavedLayoutState],
  );

  const handleDeleteAllLayoutHistory = useCallback(async () => {
    const deletedCount = await deleteNotesGraphLayoutHistoryByScope(historyScope);
    if (deletedCount === 0) return;

    replaceSessionNodePositions({});
    setActiveSavedVersion(null);
    savedLayoutSnapshotRef.current = serializeNotesGraphPositions(new Map());
    setLayoutRestoreToken((token) => token + 1);
    syncUnsavedLayoutState();
    setHistoryRefreshToken((token) => token + 1);
  }, [historyScope, syncUnsavedLayoutState]);

  const headerControlsDisabled = isGraphMapBusy || isSavingLayout || isCapturingExport;

  const toggleGraphViewMode = useCallback(() => {
    hapticSelection();
    setGraphViewMode((prev) => {
      const next = prev === '2d' ? '3d' : '2d';
      if (next === '3d') {
        setSearchBarExplicitOpen(false);
      }
      return next;
    });
  }, []);

  const appliedLayoutHeaderSubtitle = useMemo(() => {
    if (recordCount === 0 || !activeSavedVersion || hasUnsavedLayoutChanges || isGraphMapBusy) {
      return undefined;
    }

    return formatGraphAppliedLayoutHeaderSubtitle(activeSavedVersion, i18n.language, t);
  }, [activeSavedVersion, hasUnsavedLayoutChanges, i18n.language, isGraphMapBusy, recordCount, t]);

  const handleOpenExportPreview = useCallback(() => {
    if (isCapturingExport || graphViewMode === '3d') return;

    if (layoutNodes.length > 150) {
      Alert.alert(
        t('notesGraph.export.largeGraphWarningTitle'),
        t('notesGraph.export.largeGraphWarningMessage', { count: layoutNodes.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.continue'),
            style: 'destructive',
            onPress: () => {
              exportCaptureTokenRef.current += 1;
              setExportPreviewUri(null);
              setExportPreviewSize(null);
              setExportPreviewReady(false);
              setExportCaptureBackgroundId(GRAPH_EXPORT_DEFAULT_BACKGROUND_ID);
              exportPreviewBackgroundIdRef.current = GRAPH_EXPORT_DEFAULT_BACKGROUND_ID;
              setIsCapturingExport(true);
            },
          },
        ],
      );
      return;
    }

    exportCaptureTokenRef.current += 1;

    setExportPreviewUri(null);
    setExportPreviewSize(null);
    setExportPreviewReady(false);
    setExportCaptureBackgroundId(GRAPH_EXPORT_DEFAULT_BACKGROUND_ID);
    exportPreviewBackgroundIdRef.current = GRAPH_EXPORT_DEFAULT_BACKGROUND_ID;
    setIsCapturingExport(true);
  }, [graphViewMode, isCapturingExport, layoutNodes.length, t]);

  useEffect(() => {
    if (!isCapturingExport || exportPreviewUri != null) {
      return undefined;
    }

    const captureToken = exportCaptureTokenRef.current;
    let cancelled = false;

    void (async () => {
      await waitForNextFrame();
      if (cancelled || captureToken !== exportCaptureTokenRef.current) return;

      await waitForNextFrame();
      if (cancelled || captureToken !== exportCaptureTokenRef.current) return;

      setIsExportCaptureMount(true);
      await waitForNextFrame();
      if (cancelled || captureToken !== exportCaptureTokenRef.current) return;

      await waitForNextFrame();
      if (cancelled || captureToken !== exportCaptureTokenRef.current) return;

      try {
        const captured = await canvasRef.current?.captureImage();
        if (cancelled || captureToken !== exportCaptureTokenRef.current) return;
        if (!captured?.uri) {
          throw new Error('capture returned empty uri');
        }

        if (captured.wasScaledDown) {
          const tierLabel = captured.deviceMemoryTier === 'low' ? 'limited' : 'available';
          Alert.alert(
            t('notesGraph.export.scaledDownTitle'),
            t('notesGraph.export.scaledDownMessage', {
              width: captured.width,
              height: captured.height,
              tier: tierLabel,
            }),
          );
        }

        setExportPreviewUri(captured.uri);
        setExportPreviewSize({ width: captured.width, height: captured.height });
        setExportSheetVisible(true);
      } catch {
        if (cancelled || captureToken !== exportCaptureTokenRef.current) return;
        Alert.alert(t('common.error'), t('notesGraph.export.failed'));
      } finally {
        if (!cancelled && captureToken === exportCaptureTokenRef.current) {
          setIsExportCaptureMount(false);
          setIsCapturingExport(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exportPreviewUri, isCapturingExport, t]);

  const handleExportBackgroundChange = useCallback((backgroundId: GraphExportBackgroundId) => {
    exportPreviewBackgroundIdRef.current = backgroundId;
    setExportCaptureBackgroundId(backgroundId);
  }, []);

  const notesGraphMenuActions = useMemo(() => {
    const titleColor = color.text.primary;
    const actions: NativeMenuAction[] = [];
    const is2dView = graphViewMode === '2d';

    if (is2dView && isGraphMinimapAvailable(layoutNodes.length)) {
      actions.push({
        id: 'toggleMinimap',
        title: t('notesGraph.controls.toggleMinimap'),
        image: 'map',
        imageColor: titleColor,
        titleColor,
        state: minimapVisible ? 'on' : 'off',
      });
    }

    if (is2dView && foldersEnabled) {
      actions.push({
        id: 'toggleFolderHighlights',
        title: t('notesGraph.controls.toggleFolderHighlights'),
        image: 'rectangle.dashed',
        imageColor: titleColor,
        titleColor,
        state: folderHighlightsVisible ? 'on' : 'off',
      });
    }

    if (is2dView) {
      actions.push({
        id: 'toggleNodeDisplayMode',
        title: t('notesGraph.controls.toggleNodeDisplayMode'),
        image: 'dot.square',
        imageColor: titleColor,
        titleColor,
        state: nodeDisplayMode === 'dots' ? 'on' : 'off',
      });
    }

    actions.push({
      id: 'toggleShowArchived',
      title: t('notesGraph.controls.toggleShowArchived'),
      image: 'archivebox',
      imageColor: titleColor,
      titleColor,
      state: filters.showArchived ? 'on' : 'off',
    });

    if (is2dView) {
      actions.push(
        inlineNativeMenuSection('notesGraphMainSection', titleColor, [
          {
            id: 'layoutHistory',
            title: t('notesGraph.history.title'),
            image: 'clock.arrow.circlepath',
            imageColor: titleColor,
            titleColor,
          },
          {
            id: 'exportImage',
            title: t('notesGraph.export.title'),
            image: 'square.and.arrow.up',
            imageColor: titleColor,
            titleColor,
          },
        ]),
      );
    }

    return actions;
  }, [
    color.text.primary,
    filters.showArchived,
    folderHighlightsVisible,
    foldersEnabled,
    graphViewMode,
    layoutNodes.length,
    minimapVisible,
    nodeDisplayMode,
    t,
  ]);

  const headerRightSlot =
    recordCount > 0 ? (
      <View
        style={{ opacity: headerControlsDisabled ? 0.45 : 1 }}
        pointerEvents={headerControlsDisabled ? 'none' : 'auto'}
      >
        <FrostedHeaderButtonGroup color={color}>
          {records.length > 0 && graphViewMode === '2d' ? (
            <HeaderIconButton
              inFrostedGroup
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
          <HeaderIconButton
            inFrostedGroup
            iconOnly
            variant="icon"
            size="md"
            icon={
              <Box
                size={20}
                color={graphViewMode === '3d' ? color.accent.primary : color.text.primary}
                strokeWidth={2.2}
              />
            }
            color={color}
            onPress={toggleGraphViewMode}
            accessibilityLabel={
              graphViewMode === '3d' ? t('notesGraph.view2dA11y') : t('notesGraph.view3dA11y')
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
          <MenuView
            key={`notes-graph-menu-${theme}`}
            title=""
            themeVariant={isDark ? 'dark' : 'light'}
            shouldOpenOnLongPress={false}
            actions={notesGraphMenuActions}
            onPressAction={({ nativeEvent }) => {
              if (nativeEvent.event === 'layoutHistory') {
                setHistorySheetVisible(true);
                return;
              }
              if (nativeEvent.event === 'toggleNodeDisplayMode') {
                hapticSelection();
                setNodeDisplayMode((value) => {
                  const next = value === 'dots' ? 'cards' : 'dots';
                  setGraphNodeDisplayMode(next);
                  return next;
                });
                return;
              }
              if (nativeEvent.event === 'toggleFolderHighlights') {
                hapticSelection();
                setFolderHighlightsVisible((value) => {
                  const next = !value;
                  setGraphFolderHighlightsVisible(next);
                  return next;
                });
                return;
              }
              if (nativeEvent.event === 'toggleMinimap') {
                hapticSelection();
                setMinimapVisible((value) => {
                  const next = !value;
                  setGraphMinimapVisible(next);
                  return next;
                });
                return;
              }
              if (nativeEvent.event === 'toggleShowArchived') {
                hapticSelection();
                setFilters((prev) => {
                  const next = !prev.showArchived;
                  setGraphShowArchived(next);
                  return { ...prev, showArchived: next };
                });
                return;
              }
              if (nativeEvent.event === 'exportImage') {
                handleOpenExportPreview();
              }
            }}
          >
            <HeaderIconButton
              inFrostedGroup
              iconOnly
              variant="icon"
              size="md"
              icon={<MoreVertical size={21} color={color.text.primary} strokeWidth={2.2} />}
              color={color}
              onPress={() => {}}
              accessibilityLabel={t('common.moreActions')}
            />
          </MenuView>
        </FrostedHeaderButtonGroup>
      </View>
    ) : null;

  if (showFullScreenBuilding) {
    return (
      <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
        <ScreenHeader
          title={isLocalGraphMode ? t('notesGraph.localTitle') : t('notesGraph.title')}
          subtitle={focusRecordTitle ?? undefined}
          onBack={handleBack}
        />
        <GraphBuildingState
          label={t('notesGraph.building')}
          progress={buildProgress ?? undefined}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={isLocalGraphMode ? t('notesGraph.localTitle') : t('notesGraph.title')}
        subtitle={
          isLocalGraphMode
            ? (focusRecordTitle ?? t('notesGraph.localSubtitle'))
            : appliedLayoutHeaderSubtitle
        }
        onBack={handleBack}
        rightSlot={headerRightSlot}
      />

      <GraphFilterBar
        color={color}
        filters={filters}
        folders={folders}
        foldersEnabled={foldersEnabled}
        isLocalGraphMode={isLocalGraphMode}
        isProActive={isProActive}
        availableTags={availableTags}
        filteredRecordCount={filteredRecordCount}
        disabled={isGraphMapBusy || isCapturingExport}
        onFiltersChange={handleFiltersChange}
      />

      {showLargeGraphHint ? (
        <Pressable
          onPress={toggleSimplifyMode}
          disabled={isGraphMapBusy}
          accessibilityRole="button"
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: color.background.tertiary,
            opacity: isGraphMapBusy ? 0.55 : 1,
          }}
        >
          <Text style={{ color: color.text.secondary, fontSize: 13 }}>
            {simplifyActive ? t('notesGraph.simplifyActiveHint') : t('notesGraph.largeGraphHint')}
          </Text>
        </Pressable>
      ) : null}

      {showSimilarEdgesLimitedHint ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: color.background.tertiary,
            opacity: isGraphMapBusy ? 0.55 : 1,
          }}
        >
          <Text style={{ color: color.text.secondary, fontSize: 13 }}>
            {t('notesGraph.similarEdgesLimitedHint')}
          </Text>
        </View>
      ) : null}

      {recordCount === 0 ? (
        <EmptyState
          title={t('notesGraph.emptyTitle')}
          description={t('notesGraph.emptyDescription')}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {graphViewMode === '2d' ? (
            <GraphCanvas
              ref={canvasRef}
              nodes={displayNodes}
              edges={layoutEdges}
              graphWidth={graphSize.width}
              graphHeight={graphSize.height}
              color={color}
              foldersById={foldersById}
              isProActive={isProActive}
              matchedNodeIds={matchedNodeIds}
              activeNodeId={resolvedActiveNodeId}
              bottomInset={insets.bottom}
              focusViewportInsets={focusViewportInsets}
              nodeDisplayMode={nodeDisplayMode}
              onRecordPress={handleRecordPress}
              onTaskPress={handleTaskPress}
              onNodeFocus={handleNodeFocus}
              onResetView={handleClearNodeSelection}
              onReconcilingChange={setIsGraphReconciling}
              mapStatusActive={isGraphMapBusy}
              mapStatusLabel={graphMapStatusLabel}
              onLayoutPositionsChange={handleLayoutPositionsChange}
              onResetLayoutLongPress={handleDiscardUnsavedLayoutChanges}
              resetLayoutLongPressEnabled={hasUnsavedLayoutChanges}
              layoutRestoreToken={layoutRestoreToken}
              hasUnsavedLayoutChanges={hasUnsavedLayoutChanges}
              isSavingLayout={isSavingLayout}
              onSaveLayout={handleOpenLayoutSaveSheet}
              onDiscardLayout={handleDiscardUnsavedLayoutChanges}
              exportCaptureActive={isExportCaptureMount}
              exportCaptureBackgroundId={exportCaptureBackgroundId}
              isExportCapturing={isCapturingExport}
              folderHighlightsVisible={folderHighlightsVisible}
              minimapVisible={minimapVisible}
            />
          ) : (
            <GraphCanvas3D
              nodes={displayNodes}
              edges={layoutEdges}
              color={color}
              foldersById={foldersById}
              isProActive={isProActive}
              bottomInset={insets.bottom}
              mapStatusActive={isGraphMapBusy}
              mapStatusLabel={graphMapStatusLabel}
            />
          )}
        </View>
      )}

      {editTaskSheet}

      <GraphLayoutSaveSheet
        visible={layoutSaveSheetVisible}
        movedNodeCount={getSessionNodePositions().size}
        isSaving={isSavingLayout}
        onCancel={handleCancelLayoutSaveSheet}
        onSave={(name) => {
          void handleConfirmLayoutSave(name);
        }}
      />

      <GraphLayoutHistorySheet
        visible={historySheetVisible}
        historyScope={historyScope}
        folders={folders}
        foldersEnabled={foldersEnabled}
        activeVersionId={activeSavedVersion?.id ?? null}
        refreshToken={historyRefreshToken}
        onClose={() => setHistorySheetVisible(false)}
        onApply={(entry) => {
          void handleApplyLayoutVersion(entry);
        }}
        onDelete={(versionId) => {
          void handleDeleteLayoutVersion(versionId);
        }}
        onDeleteAll={() => {
          void handleDeleteAllLayoutHistory();
        }}
      />

      <GraphExportPreviewSheet
        visible={exportSheetVisible}
        imageUri={exportPreviewUri}
        imagePixelSize={exportPreviewSize}
        onBackgroundChange={handleExportBackgroundChange}
        onPreviewReady={setExportPreviewReady}
        onClose={() => {
          exportCaptureTokenRef.current += 1;
          setExportSheetVisible(false);
          setExportPreviewUri(null);
          setExportPreviewSize(null);
          setExportPreviewReady(false);
          setExportCaptureBackgroundId(GRAPH_EXPORT_DEFAULT_BACKGROUND_ID);
          exportPreviewBackgroundIdRef.current = GRAPH_EXPORT_DEFAULT_BACKGROUND_ID;
          setIsExportCaptureMount(false);
          setIsCapturingExport(false);
        }}
      />

      {showGraphSearchBar ? (
        <FloatingFrostedStickyView
          safeAreaBottom={insets.bottom}
          pointerEvents={isGraphMapBusy ? 'none' : 'auto'}
          style={{ opacity: isGraphMapBusy ? 0.55 : 1 }}
        >
          <GraphStickySearchBar
            query={searchQuery}
            debouncedQuery={debouncedSearchQuery}
            onChangeQuery={setSearchQuery}
            onSubmit={handleSearchSubmit}
            matchCount={searchMatches.length}
            matchIndex={searchMatches.length > 0 && searchMatchIndex >= 0 ? searchMatchIndex : null}
            onPreviousMatch={handleSearchPrevious}
            onNextMatch={handleSearchNext}
            color={color}
            focusSignal={searchFocusSignal}
            onClose={handleSearchCleared}
          />
        </FloatingFrostedStickyView>
      ) : null}

      {isCapturingExport || (exportSheetVisible && !exportPreviewReady) ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 1000,
            elevation: 1000,
          }}
        >
          <GraphBuildingState label={t('notesGraph.export.capturingPreview')} />
        </View>
      ) : null}
    </View>
  );
};
