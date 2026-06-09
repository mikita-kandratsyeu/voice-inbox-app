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
import { InteractionManager, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';

import { GRAPH_DRAG_RECONCILE_MIN_MS } from '../lib/graphDragReconcile';
import { getSessionNodePositions, setSessionNodePosition } from '../lib/graphSessionLayout';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';
import { computeFitTransform, computeFocusTransform } from '../lib/runForceLayout';
import { DottedBackground } from './DottedBackground';
import { GraphControls } from './GraphControls';
import { GraphEdgeLayer } from './GraphEdgeLayer';
import { GraphMinimap } from './GraphMinimap';
import { GraphNodeLayer } from './GraphNodeLayer';

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const PAN_ACTIVATION_DISTANCE = 12;

export type GraphCanvasHandle = {
  fitToScreen: () => void;
  focusNode: (node: GraphNode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
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
  onRecordPress: (recordId: string) => void;
  onTaskPress: (recordId: string, taskId: string) => void;
  onReconcilingChange?: (isReconciling: boolean) => void;
  onLayoutPositionsChange?: () => void;
  layoutRestoreToken?: number;
};

function mergeNodePositions(
  nodes: GraphNode[],
  overrides: Map<string, { x: number; y: number }>,
): GraphNode[] {
  if (overrides.size === 0) return nodes;
  return nodes.map((node) => {
    const override = overrides.get(node.id);
    return override ? { ...node, x: override.x, y: override.y } : node;
  });
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
    onRecordPress,
    onTaskPress,
    onReconcilingChange,
    onLayoutPositionsChange,
    layoutRestoreToken = 0,
  },
  ref,
) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const isNodeDragging = useSharedValue(false);
  const graphScale = useSharedValue(1);
  const [isReconciling, setIsReconciling] = useState(false);
  const reconcilingTokenRef = useRef(0);
  const reconcileStartedAtRef = useRef(0);

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

  const syncViewportState = useCallback(
    (nextScale: number, nextX: number, nextY: number) => {
      graphScale.value = nextScale;
      setViewportTransform({ scale: nextScale, translateX: nextX, translateY: nextY });
    },
    [graphScale],
  );

  const applyTransform = useCallback(
    (next: { scale: number; translateX: number; translateY: number }, animated = true) => {
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
      if (animated) {
        scale.value = withTiming(clampedScale, { duration: 220 });
        translateX.value = withTiming(next.translateX, { duration: 220 });
        translateY.value = withTiming(next.translateY, { duration: 220 });
      } else {
        scale.value = clampedScale;
        translateX.value = next.translateX;
        translateY.value = next.translateY;
      }
      savedScale.value = clampedScale;
      savedTranslateX.value = next.translateX;
      savedTranslateY.value = next.translateY;
      syncViewportState(clampedScale, next.translateX, next.translateY);
    },
    [
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
      const transform = computeFocusTransform(node, viewportWidth, viewportHeight, 1.15);
      applyTransform(transform);
    },
    [applyTransform, viewportHeight, viewportWidth],
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
  }, [applyTransform]);

  useImperativeHandle(
    ref,
    () => ({
      fitToScreen: () => fitToScreen(true, displayNodes),
      focusNode,
      zoomIn,
      zoomOut,
      resetView,
    }),
    [displayNodes, fitToScreen, focusNode, resetView, zoomIn, zoomOut],
  );

  const nodeIdsKey = useMemo(() => nodes.map((node) => node.id).join('|'), [nodes]);

  useEffect(() => {
    const session = getSessionNodePositions();
    if (session.size === 0) {
      setPositionOverrides(new Map());
      return;
    }

    const next = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      const pos = session.get(node.id);
      if (pos) next.set(node.id, pos);
    }
    setPositionOverrides(next);
  }, [layoutRestoreToken, nodeIdsKey, nodes]);

  const layoutSignature = useMemo(
    () => `${nodes.map((node) => node.id).join('|')}:${graphWidth}:${graphHeight}`,
    [graphHeight, graphWidth, nodes],
  );

  useEffect(() => {
    if (nodes.length > 0 && viewportSize.width > 0 && viewportSize.height > 0) {
      fitToScreen(false);
    }
  }, [layoutSignature, fitToScreen, nodes.length, viewportSize.height, viewportSize.width]);

  const handleNodeDragStart = useCallback(() => {
    isNodeDragging.value = true;
  }, [isNodeDragging]);

  const handleNodeDragEnd = useCallback(
    (nodeId: string, x: number, y: number) => {
      isNodeDragging.value = false;
      reconcilingTokenRef.current += 1;
      reconcileStartedAtRef.current = Date.now();
      setReconciling(true);
      setSessionNodePosition(nodeId, x, y);
      setPositionOverrides((prev) => {
        const next = new Map(prev);
        next.set(nodeId, { x, y });
        return next;
      });
      onLayoutPositionsChange?.();
    },
    [isNodeDragging, onLayoutPositionsChange, setReconciling],
  );

  useEffect(() => {
    if (!isReconciling) return;

    const token = reconcilingTokenRef.current;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
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

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(syncViewportState)(scale.value, translateX.value, translateY.value);
    });

  const pan = Gesture.Pan()
    .activeOffsetX([-PAN_ACTIVATION_DISTANCE, PAN_ACTIVATION_DISTANCE])
    .activeOffsetY([-PAN_ACTIVATION_DISTANCE, PAN_ACTIVATION_DISTANCE])
    .onUpdate((event) => {
      if (isNodeDragging.value) return;
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      if (isNodeDragging.value) return;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(syncViewportState)(scale.value, translateX.value, translateY.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * 1.35));
      const focalX = event.x;
      const focalY = event.y;
      const ratio = nextScale / savedScale.value;
      const nextTranslateX = focalX - (focalX - savedTranslateX.value) * ratio;
      const nextTranslateY = focalY - (focalY - savedTranslateY.value) * ratio;

      scale.value = withTiming(nextScale, { duration: 220 });
      translateX.value = withTiming(nextTranslateX, { duration: 220 });
      translateY.value = withTiming(nextTranslateY, { duration: 220 });
      savedScale.value = nextScale;
      savedTranslateX.value = nextTranslateX;
      savedTranslateY.value = nextTranslateY;
      runOnJS(syncViewportState)(nextScale, nextTranslateX, nextTranslateY);
    });

  const canvasGesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const [legendVisible, setLegendVisible] = React.useState(false);

  const worldWidth = useMemo(
    () => Math.max(graphWidth, viewportWidth),
    [graphWidth, viewportWidth],
  );
  const worldHeight = useMemo(
    () => Math.max(graphHeight, viewportHeight),
    [graphHeight, viewportHeight],
  );

  return (
    <View
      style={{ flex: 1, overflow: 'hidden', backgroundColor: color.background.secondary }}
      onLayout={handleCanvasLayout}
    >
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
            <DottedBackground width={worldWidth} height={worldHeight} dotColor={color.text.muted} />
            <GraphEdgeLayer
              nodes={displayNodes}
              edges={edges}
              color={color}
              width={worldWidth}
              height={worldHeight}
              matchedNodeIds={matchedNodeIds}
              activeNodeId={activeNodeId}
            />
            <GraphNodeLayer
              nodes={displayNodes}
              color={color}
              foldersById={foldersById}
              isProActive={isProActive}
              matchedNodeIds={matchedNodeIds}
              activeNodeId={activeNodeId}
              graphScale={graphScale}
              interactionsEnabled={!isReconciling}
              onRecordPress={onRecordPress}
              onTaskPress={onTaskPress}
              onNodeDragStart={handleNodeDragStart}
              onNodeDragEnd={handleNodeDragEnd}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      <GraphMinimap
        color={color}
        nodes={displayNodes}
        graphWidth={graphWidth}
        graphHeight={graphHeight}
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
        translateX={viewportTransform.translateX}
        translateY={viewportTransform.translateY}
        scale={viewportTransform.scale}
        disabled={isReconciling}
        onNavigate={(nextTranslateX, nextTranslateY) => {
          if (isReconciling) return;
          applyTransform({
            scale: savedScale.value,
            translateX: nextTranslateX,
            translateY: nextTranslateY,
          });
        }}
      />

      <GraphControls
        color={color}
        bottomInset={bottomInset}
        disabled={isReconciling}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={() => fitToScreen(true, displayNodes)}
        onReset={resetView}
        legendVisible={legendVisible}
        onToggleLegend={() => setLegendVisible((v) => !v)}
        isReconciling={isReconciling}
        reconcilingLabel={t('notesGraph.reconciling')}
      />
    </View>
  );
});
