import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ViewShotRef } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';

import type { Folder } from '@/entities/folder';
import { useSettingsStore } from '@/entities/settings';
import { type Colors, DEFAULT_ACCENT_COLOR_ID } from '@/shared/config';
import runAfterInteractions from '@/shared/lib/runAfterInteractions';

import type { GraphViewportCull } from '../lib/buildGraphRenderedEdges';
import {
  computeGraphExportLayout,
  getGraphExportViewShotMaxDimension,
  waitForGraphExportCaptureReady,
} from '../lib/computeGraphExportLayout';
import {
  computeMapDoubleTapTransform,
  computeMapPanTransform,
  computeMapPinchTransform,
} from '../lib/graphCanvasGestures';
import { buildGraphClusters } from '../lib/graphClusterLayout';
import { GRAPH_DRAG_RECONCILE_MIN_MS } from '../lib/graphDragReconcile';
import type { GraphExportBackgroundId } from '../lib/graphExportBackground';
import { resolveGraphExportColors } from '../lib/graphExportColors';
import { getSessionNodePositions, setSessionNodePosition } from '../lib/graphSessionLayout';
import type { GraphEdge, GraphNode, GraphNodeDisplayMode } from '../lib/graphTypes';
import {
  clampViewportScaleValue,
  clampViewportTransform,
  clampViewportTranslation,
  computeWorldDimensionsForNodes,
  GRAPH_VIEWPORT_MAX_SCALE,
  GRAPH_VIEWPORT_MIN_SCALE,
  resolveGraphPanOverscroll,
} from '../lib/graphViewportBounds';
import type { GraphViewportInsets } from '../lib/graphViewportInsets';
import { computeFitTransform, computeFocusTransform } from '../lib/runForceLayout';
import { DottedBackground } from './DottedBackground';
import { GraphClusterBoundaries } from './GraphClusterBoundaries';
import { GraphControls } from './GraphControls';
import { GraphEdgeLayer } from './GraphEdgeLayer';
import { GraphFullExportCapture } from './GraphFullExportCapture';
import { GraphLayoutSaveBar } from './GraphLayoutSaveBar';
import { GraphMinimap } from './GraphMinimap';
import { GRAPH_VIEWPORT_SPRING, GRAPH_VIEWPORT_TIMING_MS } from './graphNodeInteraction';
import { GraphNodeLayer } from './GraphNodeLayer';

const MIN_SCALE = GRAPH_VIEWPORT_MIN_SCALE;
const MAX_SCALE = GRAPH_VIEWPORT_MAX_SCALE;
const PAN_ACTIVATION_DISTANCE = 8;
const DOUBLE_TAP_ZOOM_FACTOR = 1.35;

export type GraphCaptureResult = {
  uri: string;
  width: number;
  height: number;
  wasScaledDown?: boolean;
  deviceMemoryTier?: string;
};

export type GraphCanvasHandle = {
  fitToScreen: () => void;
  focusNode: (node: GraphNode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  captureImage: () => Promise<GraphCaptureResult>;
};

type GraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  graphWidth: number;
  graphHeight: number;
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
  bottomInset: number;
  focusViewportInsets?: GraphViewportInsets;
  nodeDisplayMode?: GraphNodeDisplayMode;
  onRecordPress: (recordId: string) => void;
  onTaskPress: (recordId: string, taskId: string) => void;
  onNodeFocus: (nodeId: string) => void;
  onResetView?: () => void;
  onReconcilingChange?: (isReconciling: boolean) => void;
  onLayoutPositionsChange?: () => void;
  onResetLayoutLongPress?: () => void;
  resetLayoutLongPressEnabled?: boolean;
  layoutRestoreToken?: number;
  hasUnsavedLayoutChanges?: boolean;
  isSavingLayout?: boolean;
  onSaveLayout?: () => void;
  onDiscardLayout?: () => void;
  /** Mounts off-screen ViewShot tree for capture. */
  exportCaptureActive?: boolean;
  exportCaptureBackgroundId?: GraphExportBackgroundId;
  /** Shows export progress in controls without mounting the capture tree. */
  isExportCapturing?: boolean;
  folderHighlightsVisible?: boolean;
  minimapVisible?: boolean;
};

function mergeNodePositions(
  nodes: GraphNode[],
  overrides: Map<string, { x: number; y: number }>,
): GraphNode[] {
  const session = getSessionNodePositions();

  if (overrides.size === 0 && session.size === 0) {
    return nodes;
  }

  let hasChanges = false;
  const result: GraphNode[] = [];

  for (const node of nodes) {
    const override = overrides.get(node.id) ?? session.get(node.id);
    if (override && (node.x !== override.x || node.y !== override.y)) {
      result.push({ ...node, x: override.x, y: override.y });
      hasChanges = true;
    } else {
      result.push(node);
    }
  }

  return hasChanges ? result : nodes;
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  {
    nodes,
    edges,
    graphWidth,
    graphHeight,
    color,
    foldersById,
    isProActive,
    matchedNodeIds,
    activeNodeId,
    bottomInset,
    focusViewportInsets,
    nodeDisplayMode = 'cards',
    onRecordPress,
    onTaskPress,
    onNodeFocus,
    onResetView,
    onReconcilingChange,
    onLayoutPositionsChange,
    onResetLayoutLongPress,
    resetLayoutLongPressEnabled = false,
    layoutRestoreToken = 0,
    hasUnsavedLayoutChanges = false,
    isSavingLayout = false,
    onSaveLayout,
    onDiscardLayout,
    exportCaptureActive = false,
    exportCaptureBackgroundId = 'canvas',
    isExportCapturing = false,
    folderHighlightsVisible = true,
    minimapVisible = true,
  },
  ref,
) {
  const exportBusy = exportCaptureActive || isExportCapturing;
  const { t } = useTranslation();
  const accentColorId = useSettingsStore((s) => s.accentColorId);
  const exportCaptureColors = useMemo(
    () =>
      resolveGraphExportColors(
        exportCaptureBackgroundId,
        color,
        isProActive ? accentColorId : DEFAULT_ACCENT_COLOR_ID,
      ),
    [accentColorId, color, exportCaptureBackgroundId, isProActive],
  );
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const fullExportRef = useRef<ViewShotRef>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const viewportWidth = viewportSize.width > 0 ? viewportSize.width : windowWidth;
  const viewportHeight =
    viewportSize.height > 0 ? viewportSize.height : Math.max(windowHeight - 120, 320);

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewportSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  const [positionOverrides, setPositionOverrides] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(),
  );
  const [viewportTransform, setViewportTransform] = useState({
    translateX: 0,
    translateY: 0,
    scale: 1,
  });

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedFocalX = useSharedValue(0);
  const savedFocalY = useSharedValue(0);
  const isPinching = useSharedValue(false);
  const isNodeDragging = useSharedValue(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const reconcilingTokenRef = useRef(0);
  const reconcileStartedAtRef = useRef(0);
  const pendingDragReconcileRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);

  const setReconciling = useCallback(
    (next: boolean) => {
      setIsReconciling(next);
      onReconcilingChange?.(next);
    },
    [onReconcilingChange],
  );

  const displayNodes = useMemo(
    () => mergeNodePositions(nodes, positionOverrides),
    [nodes, positionOverrides],
  );

  const syncViewportState = useCallback((nextScale: number, nextX: number, nextY: number) => {
    setViewportTransform({ scale: nextScale, translateX: nextX, translateY: nextY });
  }, []);

  const {
    width: worldWidth,
    height: worldHeight,
    contentBounds,
  } = useMemo(
    () =>
      computeWorldDimensionsForNodes(
        displayNodes,
        graphWidth,
        graphHeight,
        viewportWidth,
        viewportHeight,
        MIN_SCALE,
      ),
    [displayNodes, graphHeight, graphWidth, viewportHeight, viewportWidth],
  );

  const panOverscroll = useMemo(
    () => resolveGraphPanOverscroll(viewportWidth, viewportHeight),
    [viewportHeight, viewportWidth],
  );

  const worldWidthSV = useSharedValue(worldWidth);
  const worldHeightSV = useSharedValue(worldHeight);
  const viewportWidthSV = useSharedValue(viewportWidth);
  const viewportHeightSV = useSharedValue(viewportHeight);
  const panOverscrollSV = useSharedValue(panOverscroll);
  const contentMinXSV = useSharedValue(contentBounds?.minX ?? 0);
  const contentMinYSV = useSharedValue(contentBounds?.minY ?? 0);
  const contentMaxXSV = useSharedValue(contentBounds?.maxX ?? worldWidth);
  const contentMaxYSV = useSharedValue(contentBounds?.maxY ?? worldHeight);
  const minScaleSV = useSharedValue(MIN_SCALE);
  const maxScaleSV = useSharedValue(MAX_SCALE);
  const doubleTapZoomSV = useSharedValue(DOUBLE_TAP_ZOOM_FACTOR);
  const viewportTimingMsSV = useSharedValue(GRAPH_VIEWPORT_TIMING_MS);

  useEffect(() => {
    worldWidthSV.value = worldWidth;
    worldHeightSV.value = worldHeight;
    viewportWidthSV.value = viewportWidth;
    viewportHeightSV.value = viewportHeight;
    panOverscrollSV.value = panOverscroll;
    contentMinXSV.value = contentBounds?.minX ?? 0;
    contentMinYSV.value = contentBounds?.minY ?? 0;
    contentMaxXSV.value = contentBounds?.maxX ?? worldWidth;
    contentMaxYSV.value = contentBounds?.maxY ?? worldHeight;
  }, [
    contentBounds,
    panOverscroll,
    worldHeight,
    worldWidth,
    viewportHeight,
    viewportWidth,
    worldHeightSV,
    worldWidthSV,
    viewportHeightSV,
    viewportWidthSV,
    panOverscrollSV,
    contentMinXSV,
    contentMinYSV,
    contentMaxXSV,
    contentMaxYSV,
  ]);

  const clampTransform = useCallback(
    (next: { scale: number; translateX: number; translateY: number }) =>
      clampViewportTransform(
        next,
        worldWidth,
        worldHeight,
        viewportWidth,
        viewportHeight,
        MIN_SCALE,
        MAX_SCALE,
        panOverscroll,
        contentBounds,
      ),
    [contentBounds, panOverscroll, viewportHeight, viewportWidth, worldHeight, worldWidth],
  );

  const applyTransform = useCallback(
    (next: { scale: number; translateX: number; translateY: number }, animated = true) => {
      const clamped = clampTransform(next);

      const commitViewportSync = () => {
        syncViewportState(clamped.scale, clamped.translateX, clamped.translateY);
      };

      savedScale.value = clamped.scale;
      savedTranslateX.value = clamped.translateX;
      savedTranslateY.value = clamped.translateY;

      if (animated) {
        scale.value = withSpring(clamped.scale, GRAPH_VIEWPORT_SPRING, (finished) => {
          if (finished) {
            scheduleOnRN(commitViewportSync);
          }
        });
        translateX.value = withSpring(clamped.translateX, GRAPH_VIEWPORT_SPRING);
        translateY.value = withSpring(clamped.translateY, GRAPH_VIEWPORT_SPRING);
      } else {
        scale.value = clamped.scale;
        translateX.value = clamped.translateX;
        translateY.value = clamped.translateY;
        commitViewportSync();
      }
    },
    [
      clampTransform,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      syncViewportState,
      translateX,
      translateY,
    ],
  );

  const fitToScreen = useCallback(
    (animated = true, fitNodes?: GraphNode[]) => {
      const transform = computeFitTransform(
        fitNodes ?? nodes,
        graphWidth,
        graphHeight,
        viewportWidth,
        viewportHeight,
      );
      applyTransform(transform, animated);
    },
    [applyTransform, graphHeight, graphWidth, nodes, viewportHeight, viewportWidth],
  );

  const focusNode = useCallback(
    (node: GraphNode) => {
      const transform = computeFocusTransform(
        node,
        viewportWidth,
        viewportHeight,
        1.15,
        focusViewportInsets,
      );
      applyTransform(transform);
    },
    [applyTransform, focusViewportInsets, viewportHeight, viewportWidth],
  );

  const zoomIn = useCallback(() => {
    applyTransform({
      scale: savedScale.value * 1.2,
      translateX: savedTranslateX.value,
      translateY: savedTranslateY.value,
    });
  }, [applyTransform, savedScale, savedTranslateX, savedTranslateY]);

  const zoomOut = useCallback(() => {
    applyTransform({
      scale: savedScale.value / 1.2,
      translateX: savedTranslateX.value,
      translateY: savedTranslateY.value,
    });
  }, [applyTransform, savedScale, savedTranslateX, savedTranslateY]);

  const resetView = useCallback(() => {
    applyTransform({ scale: 1, translateX: 0, translateY: 0 });
    onResetView?.();
  }, [applyTransform, onResetView]);

  const captureImage = useCallback(async () => {
    await waitForGraphExportCaptureReady(edges.length);

    const layout = computeGraphExportLayout(
      displayNodes,
      graphWidth,
      graphHeight,
      getGraphExportViewShotMaxDimension(),
    );
    const uri = await fullExportRef.current?.capture?.();
    if (!uri || !layout) {
      throw new Error('Graph capture failed');
    }
    return {
      uri,
      width: layout.exportWidth,
      height: layout.exportHeight,
      wasScaledDown: layout.wasScaledDown,
      deviceMemoryTier: layout.deviceMemoryTier,
    };
  }, [displayNodes, edges.length, graphHeight, graphWidth]);

  useImperativeHandle(
    ref,
    () => ({
      fitToScreen: () => fitToScreen(true, displayNodes),
      focusNode,
      zoomIn,
      zoomOut,
      resetView,
      captureImage,
    }),
    [captureImage, displayNodes, fitToScreen, focusNode, resetView, zoomIn, zoomOut],
  );

  const nodeIdsKey = useMemo(() => nodes.map((node) => node.id).join('|'), [nodes]);

  const layoutSignature = useMemo(
    () => `${nodes.map((node) => node.id).join('|')}:${graphWidth}:${graphHeight}`,
    [graphHeight, graphWidth, nodes],
  );

  useEffect(() => {
    if (nodes.length > 0 && viewportSize.width > 0 && viewportSize.height > 0) {
      fitToScreen(false);
    }
  }, [layoutSignature, fitToScreen, nodes.length, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    applyTransform(
      {
        scale: viewportTransform.scale,
        translateX: viewportTransform.translateX,
        translateY: viewportTransform.translateY,
      },
      false,
    );
    // Re-clamp when canvas or viewport size changes; transform values come from latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dimension-only trigger
  }, [worldWidth, worldHeight, viewportWidth, viewportHeight]);

  const handleNodeDragStart = useCallback(() => {
    isNodeDragging.value = true;
  }, [isNodeDragging]);

  const handleNodeDragCancel = useCallback(() => {
    isNodeDragging.value = false;
  }, [isNodeDragging]);

  const handleNodeDragEnd = useCallback(
    (nodeId: string, x: number, y: number) => {
      isNodeDragging.value = false;
      reconcilingTokenRef.current += 1;
      reconcileStartedAtRef.current = Date.now();
      pendingDragReconcileRef.current = { nodeId, x, y };
      setReconciling(true);
    },
    [isNodeDragging, setReconciling],
  );

  useEffect(() => {
    if (!isReconciling) return;

    const pending = pendingDragReconcileRef.current;
    if (!pending) return;

    const { nodeId, x, y } = pending;
    pendingDragReconcileRef.current = null;
    setSessionNodePosition(nodeId, x, y);
    setPositionOverrides((prev) => {
      const next = new Map(prev);
      next.set(nodeId, { x, y });
      return next;
    });
    onLayoutPositionsChange?.();
  }, [isReconciling, onLayoutPositionsChange]);

  useEffect(() => {
    const session = getSessionNodePositions();
    if (session.size === 0) {
      setPositionOverrides((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }

    setPositionOverrides((prev) => {
      const next = new Map<string, { x: number; y: number }>();
      for (const node of nodes) {
        const pos = session.get(node.id);
        if (pos) next.set(node.id, pos);
      }
      if (
        prev.size === next.size &&
        [...next.entries()].every(([id, pos]) => {
          const existing = prev.get(id);
          return existing?.x === pos.x && existing?.y === pos.y;
        })
      ) {
        return prev;
      }
      return next;
    });
  }, [layoutRestoreToken, nodeIdsKey, nodes]);

  useEffect(() => {
    if (!isReconciling) return;

    const token = reconcilingTokenRef.current;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const interactionHandle = runAfterInteractions(() => {
      const elapsed = Date.now() - reconcileStartedAtRef.current;
      const delay = Math.max(0, GRAPH_DRAG_RECONCILE_MIN_MS - elapsed);
      timeoutId = setTimeout(() => {
        if (cancelled || token !== reconcilingTokenRef.current) return;
        setReconciling(false);
      }, delay);
    });

    return () => {
      cancelled = true;
      interactionHandle.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isReconciling, positionOverrides, setReconciling]);

  const clampViewportScale = (value: number) => {
    'worklet';
    return clampViewportScaleValue(value, minScaleSV.value, maxScaleSV.value);
  };

  const syncGestureBaseline = () => {
    'worklet';
    savedScale.value = scale.value;
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  };

  const clampTranslationWorklet = (tx: number, ty: number, currentScale: number) => {
    'worklet';
    return clampViewportTranslation(
      tx,
      ty,
      currentScale,
      worldWidthSV.value,
      worldHeightSV.value,
      viewportWidthSV.value,
      viewportHeightSV.value,
      panOverscrollSV.value,
      contentMinXSV.value,
      contentMinYSV.value,
      contentMaxXSV.value,
      contentMaxYSV.value,
    );
  };

  const commitViewportFromGesture = () => {
    'worklet';
    savedScale.value = scale.value;
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
    scheduleOnRN(syncViewportState, scale.value, translateX.value, translateY.value);
  };

  const applyMapPinch = (pinchScale: number, focalX: number, focalY: number) => {
    'worklet';
    const next = computeMapPinchTransform(
      savedScale.value,
      savedTranslateX.value,
      savedTranslateY.value,
      savedFocalX.value,
      savedFocalY.value,
      pinchScale,
      focalX,
      focalY,
    );
    const clampedScale = clampViewportScale(next.scale);
    const clamped = clampTranslationWorklet(next.translateX, next.translateY, clampedScale);
    scale.value = clampedScale;
    translateX.value = clamped.translateX;
    translateY.value = clamped.translateY;
  };

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      'worklet';
      if (isNodeDragging.value) return;
      isPinching.value = true;
      syncGestureBaseline();
      savedFocalX.value = event.focalX;
      savedFocalY.value = event.focalY;
    })
    .onUpdate((event) => {
      'worklet';
      if (isNodeDragging.value) return;
      applyMapPinch(event.scale, event.focalX, event.focalY);
    })
    .onFinalize(() => {
      'worklet';
      if (!isPinching.value) return;
      isPinching.value = false;
      commitViewportFromGesture();
    });

  const pan = Gesture.Pan()
    .minDistance(PAN_ACTIVATION_DISTANCE)
    .maxPointers(1)
    .onTouchesMove((event, state) => {
      'worklet';
      if (event.numberOfTouches > 1 || isPinching.value) {
        state.fail();
      }
    })
    .onStart(() => {
      'worklet';
      if (isNodeDragging.value || isPinching.value) return;
      syncGestureBaseline();
    })
    .onUpdate((event) => {
      'worklet';
      if (isNodeDragging.value || isPinching.value) return;
      const next = computeMapPanTransform(
        savedTranslateX.value,
        savedTranslateY.value,
        event.translationX,
        event.translationY,
      );
      const clamped = clampTranslationWorklet(next.translateX, next.translateY, scale.value);
      translateX.value = clamped.translateX;
      translateY.value = clamped.translateY;
    })
    .onFinalize(() => {
      'worklet';
      if (isNodeDragging.value || isPinching.value) return;
      commitViewportFromGesture();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((event) => {
      'worklet';
      syncGestureBaseline();
      const next = computeMapDoubleTapTransform(
        savedScale.value,
        savedTranslateX.value,
        savedTranslateY.value,
        event.x,
        event.y,
        doubleTapZoomSV.value,
      );
      const clampedScale = clampViewportScale(next.scale);
      const clamped = clampTranslationWorklet(next.translateX, next.translateY, clampedScale);

      savedScale.value = clampedScale;
      savedTranslateX.value = clamped.translateX;
      savedTranslateY.value = clamped.translateY;

      const timing = {
        duration: viewportTimingMsSV.value,
        easing: Easing.out(Easing.cubic),
      };

      scale.value = withTiming(clampedScale, timing, (finished) => {
        if (finished) {
          scheduleOnRN(syncViewportState, clampedScale, clamped.translateX, clamped.translateY);
        }
      });
      translateX.value = withTiming(clamped.translateX, timing);
      translateY.value = withTiming(clamped.translateY, timing);
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .maxDistance(PAN_ACTIVATION_DISTANCE)
    .onEnd(() => {
      'worklet';
      if (onResetView) {
        scheduleOnRN(onResetView);
      }
    });

  const tapGestures = Gesture.Exclusive(doubleTap, singleTap);

  const canvasGesture = Gesture.Simultaneous(Gesture.Simultaneous(pinch, pan), tapGestures);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const [legendVisible, setLegendVisible] = React.useState(false);

  const clusters = useMemo(() => buildGraphClusters(displayNodes, edges), [displayNodes, edges]);

  const edgeViewportCull = useMemo<GraphViewportCull | null>(() => {
    if (edges.length < 48) return null;

    return {
      translateX: viewportTransform.translateX,
      translateY: viewportTransform.translateY,
      scale: viewportTransform.scale,
      viewportWidth,
      viewportHeight,
    };
  }, [
    edges.length,
    viewportHeight,
    viewportTransform.scale,
    viewportTransform.translateX,
    viewportTransform.translateY,
    viewportWidth,
  ]);

  return (
    <View
      style={{ flex: 1, overflow: 'hidden', backgroundColor: color.background.secondary }}
      onLayout={handleCanvasLayout}
    >
      <DottedBackground width={viewportWidth} height={viewportHeight} dotColor={color.text.muted} />
      <GestureDetector gesture={canvasGesture}>
        <View collapsable={false} style={{ flex: 1, overflow: 'hidden' }}>
          <Animated.View
            style={[
              {
                width: worldWidth,
                height: worldHeight,
                transformOrigin: 'left top',
              },
              animatedStyle,
            ]}
          >
            <GraphClusterBoundaries
              nodes={displayNodes}
              clusters={clusters}
              foldersById={foldersById}
              isProActive={isProActive}
              color={color}
              width={worldWidth}
              height={worldHeight}
              visible={!exportBusy}
              showFolderClusters={folderHighlightsVisible}
            />
            <GraphEdgeLayer
              nodes={displayNodes}
              edges={edges}
              color={color}
              width={worldWidth}
              height={worldHeight}
              matchedNodeIds={matchedNodeIds}
              activeNodeId={activeNodeId}
              viewportCull={edgeViewportCull}
              nodeDisplayMode={nodeDisplayMode}
            />
            <GraphNodeLayer
              nodes={displayNodes}
              edges={edges}
              color={color}
              foldersById={foldersById}
              isProActive={isProActive}
              matchedNodeIds={matchedNodeIds}
              activeNodeId={activeNodeId}
              canvasScale={scale}
              layoutRestoreToken={layoutRestoreToken}
              interactionsEnabled={!isReconciling && !exportBusy}
              nodeDisplayMode={nodeDisplayMode}
              onRecordPress={onRecordPress}
              onTaskPress={onTaskPress}
              onNodeFocus={onNodeFocus}
              onNodeDragStart={handleNodeDragStart}
              onNodeDragEnd={handleNodeDragEnd}
              onNodeDragCancel={handleNodeDragCancel}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      {exportCaptureActive ? (
        <GraphFullExportCapture
          ref={fullExportRef}
          nodes={displayNodes}
          edges={edges}
          graphWidth={graphWidth}
          graphHeight={graphHeight}
          color={exportCaptureColors}
          foldersById={foldersById}
          isProActive={isProActive}
          nodeDisplayMode={nodeDisplayMode}
        />
      ) : null}

      {minimapVisible ? (
        <GraphMinimap
          color={color}
          nodes={displayNodes}
          worldWidth={worldWidth}
          worldHeight={worldHeight}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          translateX={translateX}
          translateY={translateY}
          scale={scale}
          disabled={isReconciling || exportBusy}
          onNavigate={(nextTranslateX, nextTranslateY) => {
            if (isReconciling || exportBusy) return;
            applyTransform({
              scale: savedScale.value,
              translateX: nextTranslateX,
              translateY: nextTranslateY,
            });
          }}
        />
      ) : null}

      <GraphControls
        color={color}
        bottomInset={bottomInset}
        disabled={isReconciling || exportBusy}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={() => fitToScreen(true, displayNodes)}
        onReset={resetView}
        onResetLayoutLongPress={onResetLayoutLongPress}
        resetLayoutLongPressEnabled={resetLayoutLongPressEnabled}
        legendVisible={legendVisible}
        onToggleLegend={() => setLegendVisible((v) => !v)}
        isReconciling={isReconciling}
        reconcilingLabel={t('notesGraph.reconciling')}
        isExportCapturing={isExportCapturing}
        exportCapturingLabel={t('notesGraph.export.capturingPreview')}
      />

      {hasUnsavedLayoutChanges && onSaveLayout && onDiscardLayout ? (
        <GraphLayoutSaveBar
          color={color}
          bottomInset={bottomInset}
          isSaving={isSavingLayout}
          disabled={isReconciling || exportBusy}
          onSave={onSaveLayout}
          onDiscard={onDiscardLayout}
        />
      ) : null}
    </View>
  );
});
