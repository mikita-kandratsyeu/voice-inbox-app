import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

import type { GraphViewportCull } from '../lib/buildGraphRenderedEdges';
import { buildGraphRenderedNodes } from '../lib/buildGraphRenderedNodes';
import type { CollapsedClusterNode } from '../lib/graphCollapsedClusters';
import { snapGraphPointToGrid } from '../lib/graphSnapGrid';
import type { GraphEdge, GraphNode, GraphNodeDisplayMode, GraphNodeLOD } from '../lib/graphTypes';
import { RECORD_NODE_WIDTH, TASK_NODE_WIDTH } from '../lib/graphTypes';
import { GRAPH_CLUSTER_BOUNDARY_PADDING } from '../lib/graphViewportBounds';
import {
  buildGraphActiveNeighborIds,
  graphNodeStackOrder,
  type GraphNodeVisualState,
  resolveGraphNodeVisualState,
} from '../lib/resolveGraphNodeVisualState';
import { GraphNodeCard } from './GraphNodeCard';
import { GraphNodeDot } from './GraphNodeDot';
import {
  GRAPH_NODE_INTERACTION_DRAGGING,
  GRAPH_NODE_INTERACTION_IDLE,
  GRAPH_NODE_INTERACTION_PRESSING,
  GRAPH_NODE_LONG_PRESS_MS,
} from './graphNodeInteraction';

type GraphNodeLayerProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
  canvasScale: SharedValue<number>;
  worldWidth: number;
  worldHeight: number;
  layoutRestoreToken?: number;
  interactionsEnabled?: boolean;
  nodeDisplayMode?: GraphNodeDisplayMode;
  nodeLOD?: GraphNodeLOD;
  collapsedClusters?: Map<string, CollapsedClusterNode>;
  viewportCull?: GraphViewportCull | null;
  onRecordPress: (recordId: string) => void;
  onTaskPress: (recordId: string, taskId: string) => void;
  onNodeDragStart: () => void;
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void;
  onNodeDragCancel: () => void;
  onNodeFocus: (nodeId: string) => void;
};

function DraggableNodeShell({
  node,
  canvasScale,
  worldWidth,
  worldHeight,
  layoutRestoreToken,
  stackOrder = 0,
  dimmed = false,
  onDragStart,
  onDragEnd,
  onDragCancel,
  onPress,
  onFocus,
  children,
}: {
  node: GraphNode;
  canvasScale: SharedValue<number>;
  worldWidth: number;
  worldHeight: number;
  layoutRestoreToken: number;
  stackOrder?: number;
  dimmed?: boolean;
  onDragStart: () => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  onDragCancel: () => void;
  onPress: () => void;
  onFocus: () => void;
  children: (interactionPhase: SharedValue<number>) => React.ReactNode;
}) {
  const isDraggingRef = useRef(false);
  const nodeId = node.id;
  const interactionPhase = useSharedValue(GRAPH_NODE_INTERACTION_IDLE);

  const nodeLeft = useSharedValue(node.x);
  const nodeTop = useSharedValue(node.y);
  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);

  const nodeWidth = node.kind === 'task' ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;
  const nodeHeight = 96; // Approximate node height for boundary checks

  useLayoutEffect(() => {
    if (isDraggingRef.current) return;
    nodeLeft.value = node.x;
    nodeTop.value = node.y;
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
  }, [dragOffsetX, dragOffsetY, layoutRestoreToken, node.x, node.y, nodeLeft, nodeTop]);

  const clampNodePosition = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      'worklet';
      const edgePadding = GRAPH_CLUSTER_BOUNDARY_PADDING;
      const minX = edgePadding;
      const minY = edgePadding;
      const maxX = worldWidth - nodeWidth - edgePadding;
      const maxY = worldHeight - nodeHeight - edgePadding;

      return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      };
    },
    [worldWidth, worldHeight, nodeWidth, nodeHeight],
  );

  const handleDragEndComplete = useCallback(
    (nodeId: string, x: number, y: number) => {
      isDraggingRef.current = false;
      onDragEnd(nodeId, x, y);
    },
    [onDragEnd],
  );

  const handleDragCancel = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    nodeLeft.value = node.x;
    nodeTop.value = node.y;
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
    onDragCancel();
  }, [dragOffsetX, dragOffsetY, node.x, node.y, nodeLeft, nodeTop, onDragCancel]);

  const handleCanvasDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
    onDragStart();
  }, [dragOffsetX, dragOffsetY, onDragStart]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const handleFocus = useCallback(() => {
    onFocus();
  }, [onFocus]);

  const dragGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(GRAPH_NODE_LONG_PRESS_MS - 20)
      .onEnd((_event, success) => {
        'worklet';
        if (!success) return;
        scheduleOnRN(handlePress);
      });

    if (dimmed) {
      return tap;
    }

    const longPressHint = Gesture.LongPress()
      .minDuration(GRAPH_NODE_LONG_PRESS_MS)
      .onBegin(() => {
        'worklet';
        interactionPhase.value = GRAPH_NODE_INTERACTION_PRESSING;
      })
      .onStart(() => {
        'worklet';
        scheduleOnRN(handleCanvasDragStart);
        scheduleOnRN(hapticLight);
      })
      .onFinalize((_event, success) => {
        'worklet';
        if (interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING) {
          return;
        }
        scheduleOnRN(handleDragCancel);
        interactionPhase.value = withTiming(0, {
          duration: 160,
        });
        if (!success) return;
        scheduleOnRN(handleFocus);
      });

    const pan = Gesture.Pan()
      .activateAfterLongPress(GRAPH_NODE_LONG_PRESS_MS)
      .onStart(() => {
        'worklet';
        interactionPhase.value = GRAPH_NODE_INTERACTION_DRAGGING;
      })
      .onUpdate((event) => {
        'worklet';
        const viewportScale = Math.max(canvasScale.value, 0.001);
        const baseLeft = nodeLeft.value;
        const baseTop = nodeTop.value;
        const snapped = snapGraphPointToGrid(
          baseLeft + event.translationX / viewportScale,
          baseTop + event.translationY / viewportScale,
        );
        const clamped = clampNodePosition(snapped.x, snapped.y);
        dragOffsetX.value = clamped.x - baseLeft;
        dragOffsetY.value = clamped.y - baseTop;
      })
      .onEnd((event) => {
        'worklet';
        const viewportScale = Math.max(canvasScale.value, 0.001);
        const baseLeft = nodeLeft.value;
        const baseTop = nodeTop.value;
        const snapped = snapGraphPointToGrid(
          baseLeft + event.translationX / viewportScale,
          baseTop + event.translationY / viewportScale,
        );
        const clamped = clampNodePosition(snapped.x, snapped.y);
        const finalX = clamped.x;
        const finalY = clamped.y;

        nodeLeft.value = finalX;
        nodeTop.value = finalY;
        dragOffsetX.value = 0;
        dragOffsetY.value = 0;

        interactionPhase.value = withTiming(0, {
          duration: 160,
        });
        scheduleOnRN(handleDragEndComplete, nodeId, finalX, finalY);
        scheduleOnRN(handleFocus);
      })
      .onFinalize((_event, success) => {
        'worklet';
        if (success) return;
        if (interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING) {
          scheduleOnRN(handleDragCancel);
        }
        interactionPhase.value = withTiming(0, {
          duration: 160,
        });
      });

    return Gesture.Simultaneous(Gesture.Exclusive(pan, tap), longPressHint);
  }, [
    canvasScale,
    clampNodePosition,
    dimmed,
    dragOffsetX,
    dragOffsetY,
    handleCanvasDragStart,
    handleDragCancel,
    handleDragEndComplete,
    handleFocus,
    handlePress,
    interactionPhase,
    nodeId,
    nodeLeft,
    nodeTop,
  ]);

  const shellStyle = useAnimatedStyle(
    () => ({
      position: 'absolute',
      left: nodeLeft.value + dragOffsetX.value,
      top: nodeTop.value + dragOffsetY.value,
      width: nodeWidth,
      zIndex:
        interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING
          ? 20
          : interactionPhase.value >= GRAPH_NODE_INTERACTION_PRESSING
            ? 10
            : stackOrder,
    }),
    [stackOrder],
  );

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View collapsable={false} style={shellStyle}>
        {children(interactionPhase)}
      </Animated.View>
    </GestureDetector>
  );
}

type GraphNodeItemProps = {
  node: GraphNode;
  color: Colors;
  folder?: Folder;
  isProActive: boolean;
  dimmed: boolean;
  active: boolean;
  highlighted: boolean;
  neighbor: boolean;
  nodeDisplayMode?: GraphNodeDisplayMode;
  nodeLOD?: GraphNodeLOD;
  onRecordPress: (recordId: string) => void;
  onTaskPress: (recordId: string, taskId: string) => void;
  onNodeDragStart: () => void;
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void;
  onNodeDragCancel: () => void;
  onNodeFocus: (nodeId: string) => void;
  canvasScale: SharedValue<number>;
  worldWidth: number;
  worldHeight: number;
  layoutRestoreToken?: number;
};

const GraphNodeItem = React.memo(
  function GraphNodeItem({
    node,
    color,
    folder,
    isProActive,
    dimmed,
    active,
    highlighted,
    neighbor,
    nodeDisplayMode = 'cards',
    nodeLOD = 'full',
    onRecordPress,
    onTaskPress,
    onNodeDragStart,
    onNodeDragEnd,
    onNodeDragCancel,
    onNodeFocus,
    canvasScale,
    worldWidth,
    worldHeight,
    layoutRestoreToken = 0,
  }: GraphNodeItemProps) {
    const skipNextPressRef = useRef(false);

    const handlePress = useCallback(() => {
      if (skipNextPressRef.current) {
        skipNextPressRef.current = false;
        return;
      }
      hapticLight();
      if (node.kind === 'record' && node.record) {
        onRecordPress(node.record.id);
        return;
      }
      if (node.kind === 'task' && node.parentRecordId && node.task) {
        onTaskPress(node.parentRecordId, node.task.id);
      }
    }, [node, onRecordPress, onTaskPress]);

    const handleDragEnd = useCallback(
      (nodeId: string, x: number, y: number) => {
        skipNextPressRef.current = true;
        onNodeDragEnd(nodeId, x, y);
      },
      [onNodeDragEnd],
    );

    return (
      <DraggableNodeShell
        node={node}
        canvasScale={canvasScale}
        worldWidth={worldWidth}
        worldHeight={worldHeight}
        layoutRestoreToken={layoutRestoreToken}
        stackOrder={graphNodeStackOrder({ active, neighbor, dimmed, highlighted })}
        dimmed={dimmed}
        onDragStart={onNodeDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={onNodeDragCancel}
        onFocus={() => onNodeFocus(node.id)}
        onPress={handlePress}
      >
        {(interactionPhase) =>
          nodeDisplayMode === 'dots' ? (
            <GraphNodeDot
              node={node}
              color={color}
              folderColor={folder?.color}
              isProActive={isProActive}
              highlighted={highlighted}
              dimmed={dimmed}
              active={active}
              neighbor={neighbor}
              interactionPhase={interactionPhase}
            />
          ) : (
            <GraphNodeCard
              node={node}
              color={color}
              folderName={folder?.name}
              folderColor={folder?.color}
              folderIcon={folder?.icon}
              isProActive={isProActive}
              highlighted={highlighted}
              dimmed={dimmed}
              active={active}
              neighbor={neighbor}
              interactionPhase={interactionPhase}
              lod={nodeLOD}
            />
          )
        }
      </DraggableNodeShell>
    );
  },
  (prev, next) => {
    if (prev.node.id !== next.node.id) return false;
    if (prev.dimmed !== next.dimmed) return false;
    if (prev.active !== next.active) return false;
    if (prev.neighbor !== next.neighbor) return false;
    if (prev.highlighted !== next.highlighted) return false;
    if (prev.nodeDisplayMode !== next.nodeDisplayMode) return false;
    if (prev.layoutRestoreToken !== next.layoutRestoreToken) return false;
    if (prev.node.x !== next.node.x || prev.node.y !== next.node.y) return false;
    return true;
  },
);

export const GraphNodeLayer = React.memo(function GraphNodeLayer({
  nodes,
  edges,
  color,
  foldersById,
  isProActive,
  matchedNodeIds,
  activeNodeId,
  canvasScale,
  worldWidth,
  worldHeight,
  interactionsEnabled = true,
  nodeDisplayMode = 'cards',
  nodeLOD = 'full',
  viewportCull,
  onRecordPress,
  onTaskPress,
  onNodeDragStart,
  onNodeDragEnd,
  onNodeDragCancel,
  onNodeFocus,
  layoutRestoreToken = 0,
}: GraphNodeLayerProps) {
  const activeNeighborIds = useMemo(
    () => (activeNodeId ? buildGraphActiveNeighborIds(activeNodeId, edges) : new Set<string>()),
    [activeNodeId, edges],
  );

  const visibleNodes = useMemo(() => {
    if (!viewportCull) return nodes;
    return buildGraphRenderedNodes(nodes, viewportCull);
  }, [nodes, viewportCull]);

  const sortedNodes = useMemo(() => {
    const tasks = visibleNodes.filter((n) => n.kind === 'task');
    const records = visibleNodes.filter((n) => n.kind === 'record');
    return [...records, ...tasks];
  }, [visibleNodes]);

  const visualStatesById = useMemo(() => {
    const states = new Map<string, GraphNodeVisualState>();
    for (const node of nodes) {
      states.set(
        node.id,
        resolveGraphNodeVisualState(node.id, activeNodeId, activeNeighborIds, matchedNodeIds),
      );
    }
    return states;
  }, [nodes, activeNodeId, activeNeighborIds, matchedNodeIds]);

  return (
    <View
      pointerEvents={interactionsEnabled ? 'box-none' : 'none'}
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
    >
      {sortedNodes.map((node) => {
        const folder =
          node.record?.folderId != null ? foldersById.get(node.record.folderId) : undefined;
        const visualState = visualStatesById.get(node.id)!;

        return (
          <GraphNodeItem
            key={node.id}
            node={node}
            color={color}
            folder={folder}
            isProActive={isProActive}
            dimmed={visualState.dimmed}
            active={visualState.active}
            neighbor={visualState.neighbor}
            highlighted={visualState.highlighted}
            nodeDisplayMode={nodeDisplayMode}
            nodeLOD={nodeLOD}
            onRecordPress={onRecordPress}
            onTaskPress={onTaskPress}
            onNodeDragStart={onNodeDragStart}
            onNodeDragEnd={onNodeDragEnd}
            onNodeDragCancel={onNodeDragCancel}
            onNodeFocus={onNodeFocus}
            canvasScale={canvasScale}
            worldWidth={worldWidth}
            worldHeight={worldHeight}
            layoutRestoreToken={layoutRestoreToken}
          />
        );
      })}
    </View>
  );
});
