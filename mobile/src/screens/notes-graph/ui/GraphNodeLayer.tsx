import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

import type { GraphNode } from '../lib/graphTypes';
import { RECORD_NODE_WIDTH, TASK_NODE_WIDTH } from '../lib/graphTypes';
import { GraphNodeCard } from './GraphNodeCard';
import {
  GRAPH_NODE_INTERACTION_DRAGGING,
  GRAPH_NODE_INTERACTION_IDLE,
  GRAPH_NODE_INTERACTION_PRESSING,
  GRAPH_NODE_LONG_PRESS_MS,
  GRAPH_NODE_PRESS_IN_MS,
  GRAPH_NODE_RELEASE_MS,
} from './graphNodeInteraction';

type GraphNodeLayerProps = {
  nodes: GraphNode[];
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
  canvasScale: SharedValue<number>;
  interactionsEnabled?: boolean;
  onRecordPress: (recordId: string) => void;
  onTaskPress: (recordId: string, taskId: string) => void;
  onNodeDragStart: () => void;
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void;
  onNodeDragCancel: () => void;
};

function nodeIsDimmed(
  nodeId: string,
  matchedNodeIds: ReadonlySet<string> | null,
  activeNodeId: string | null,
): boolean {
  if (!matchedNodeIds || matchedNodeIds.size === 0) return false;
  if (nodeId === activeNodeId) return false;
  return !matchedNodeIds.has(nodeId);
}

function DraggableNodeShell({
  node,
  canvasScale,
  onDragStart,
  onDragEnd,
  onDragCancel,
  onPress,
  children,
}: {
  node: GraphNode;
  canvasScale: SharedValue<number>;
  onDragStart: () => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  onDragCancel: () => void;
  onPress: () => void;
  children: (interactionPhase: SharedValue<number>) => React.ReactNode;
}) {
  const nodeRef = React.useRef(node);
  nodeRef.current = node;
  const isDraggingRef = useRef(false);
  const interactionPhase = useSharedValue(GRAPH_NODE_INTERACTION_IDLE);

  const nodeLeft = useSharedValue(node.x);
  const nodeTop = useSharedValue(node.y);
  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);

  const nodeWidth = node.kind === 'task' ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;

  useLayoutEffect(() => {
    if (isDraggingRef.current) return;
    nodeLeft.value = node.x;
    nodeTop.value = node.y;
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
  }, [node.x, node.y, dragOffsetX, dragOffsetY, nodeLeft, nodeTop]);

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
    const current = nodeRef.current;
    nodeLeft.value = current.x;
    nodeTop.value = current.y;
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
    onDragCancel();
  }, [dragOffsetX, dragOffsetY, nodeLeft, nodeTop, onDragCancel]);

  const handleCanvasDragStart = useCallback(() => {
    const current = nodeRef.current;
    isDraggingRef.current = true;
    nodeLeft.value = current.x;
    nodeTop.value = current.y;
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
    onDragStart();
  }, [dragOffsetX, dragOffsetY, nodeLeft, nodeTop, onDragStart]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const dragGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(GRAPH_NODE_LONG_PRESS_MS - 20)
      .onEnd((_event, success) => {
        if (!success) return;
        runOnJS(handlePress)();
      });

    const longPressHint = Gesture.LongPress()
      .minDuration(GRAPH_NODE_LONG_PRESS_MS)
      .onBegin(() => {
        interactionPhase.value = withTiming(GRAPH_NODE_INTERACTION_PRESSING, {
          duration: GRAPH_NODE_PRESS_IN_MS,
        });
      })
      .onFinalize(() => {
        if (interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING) return;
        interactionPhase.value = withTiming(GRAPH_NODE_INTERACTION_IDLE, {
          duration: GRAPH_NODE_RELEASE_MS,
        });
      });

    const pan = Gesture.Pan()
      .activateAfterLongPress(GRAPH_NODE_LONG_PRESS_MS)
      .onStart(() => {
        runOnJS(handleCanvasDragStart)();
        interactionPhase.value = GRAPH_NODE_INTERACTION_DRAGGING;
        runOnJS(hapticLight)();
      })
      .onUpdate((event) => {
        const viewportScale = Math.max(canvasScale.value, 0.001);
        dragOffsetX.value = event.translationX / viewportScale;
        dragOffsetY.value = event.translationY / viewportScale;
      })
      .onEnd((event) => {
        const current = nodeRef.current;
        const viewportScale = Math.max(canvasScale.value, 0.001);
        const finalX = nodeLeft.value + event.translationX / viewportScale;
        const finalY = nodeTop.value + event.translationY / viewportScale;

        nodeLeft.value = finalX;
        nodeTop.value = finalY;
        dragOffsetX.value = 0;
        dragOffsetY.value = 0;

        interactionPhase.value = withTiming(GRAPH_NODE_INTERACTION_IDLE, {
          duration: GRAPH_NODE_RELEASE_MS,
        });
        runOnJS(handleDragEndComplete)(current.id, finalX, finalY);
      })
      .onFinalize((_event, success) => {
        if (success) return;
        if (interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING) {
          runOnJS(handleDragCancel)();
        }
        interactionPhase.value = withTiming(GRAPH_NODE_INTERACTION_IDLE, {
          duration: GRAPH_NODE_RELEASE_MS,
        });
      });

    return Gesture.Simultaneous(Gesture.Exclusive(pan, tap), longPressHint);
  }, [
    canvasScale,
    dragOffsetX,
    dragOffsetY,
    handleCanvasDragStart,
    handleDragCancel,
    handleDragEndComplete,
    handlePress,
    interactionPhase,
    nodeLeft,
    nodeTop,
  ]);

  const shellStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: nodeLeft.value + dragOffsetX.value,
    top: nodeTop.value + dragOffsetY.value,
    width: nodeWidth,
    zIndex:
      interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING
        ? 20
        : interactionPhase.value >= GRAPH_NODE_INTERACTION_PRESSING
          ? 10
          : 0,
  }));

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
  onRecordPress: (recordId: string) => void;
  onTaskPress: (recordId: string, taskId: string) => void;
  onNodeDragStart: () => void;
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void;
  onNodeDragCancel: () => void;
  canvasScale: SharedValue<number>;
};

const GraphNodeItem = React.memo(function GraphNodeItem({
  node,
  color,
  folder,
  isProActive,
  dimmed,
  active,
  highlighted,
  onRecordPress,
  onTaskPress,
  onNodeDragStart,
  onNodeDragEnd,
  onNodeDragCancel,
  canvasScale,
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
      onDragStart={onNodeDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={onNodeDragCancel}
      onPress={handlePress}
    >
      {(interactionPhase) => (
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
          interactionPhase={interactionPhase}
        />
      )}
    </DraggableNodeShell>
  );
});

export const GraphNodeLayer = React.memo(function GraphNodeLayer({
  nodes,
  color,
  foldersById,
  isProActive,
  matchedNodeIds,
  activeNodeId,
  canvasScale,
  interactionsEnabled = true,
  onRecordPress,
  onTaskPress,
  onNodeDragStart,
  onNodeDragEnd,
  onNodeDragCancel,
}: GraphNodeLayerProps) {
  const sortedNodes = useMemo(() => {
    const tasks = nodes.filter((n) => n.kind === 'task');
    const records = nodes.filter((n) => n.kind === 'record');
    return [...records, ...tasks];
  }, [nodes]);

  return (
    <View
      pointerEvents={interactionsEnabled ? 'box-none' : 'none'}
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
    >
      {sortedNodes.map((node) => {
        const folder =
          node.record?.folderId != null ? foldersById.get(node.record.folderId) : undefined;
        const dimmed = nodeIsDimmed(node.id, matchedNodeIds, activeNodeId);
        const active = activeNodeId === node.id;
        const highlighted = active || (matchedNodeIds?.has(node.id) ?? false);

        return (
          <GraphNodeItem
            key={node.id}
            node={node}
            color={color}
            folder={folder}
            isProActive={isProActive}
            dimmed={dimmed}
            active={active}
            highlighted={highlighted}
            onRecordPress={onRecordPress}
            onTaskPress={onTaskPress}
            onNodeDragStart={onNodeDragStart}
            onNodeDragEnd={onNodeDragEnd}
            onNodeDragCancel={onNodeDragCancel}
            canvasScale={canvasScale}
          />
        );
      })}
    </View>
  );
});
