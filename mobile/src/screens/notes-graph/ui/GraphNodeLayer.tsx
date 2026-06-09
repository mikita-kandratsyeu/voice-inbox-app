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
import { GraphNodeCard, GraphNodeCardWrapper } from './GraphNodeCard';
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
  children,
}: {
  node: GraphNode;
  canvasScale: SharedValue<number>;
  onDragStart: () => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  children: (interactionPhase: SharedValue<number>) => React.ReactNode;
}) {
  const nodeRef = React.useRef(node);
  nodeRef.current = node;
  const dragOriginRef = React.useRef({ x: node.x, y: node.y });
  const interactionPhase = useSharedValue(GRAPH_NODE_INTERACTION_IDLE);

  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);

  useLayoutEffect(() => {
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
  }, [node.x, node.y, dragOffsetX, dragOffsetY]);

  const handleCanvasDragStart = useCallback(() => {
    dragOriginRef.current = { x: nodeRef.current.x, y: nodeRef.current.y };
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
    onDragStart();
  }, [dragOffsetX, dragOffsetY, onDragStart]);

  const dragGesture = useMemo(() => {
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
      .onBegin(() => {
        runOnJS(handleCanvasDragStart)();
      })
      .onStart(() => {
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
        interactionPhase.value = withTiming(GRAPH_NODE_INTERACTION_IDLE, {
          duration: GRAPH_NODE_RELEASE_MS,
        });
        runOnJS(onDragEnd)(
          current.id,
          dragOriginRef.current.x + event.translationX / viewportScale,
          dragOriginRef.current.y + event.translationY / viewportScale,
        );
      });

    return Gesture.Simultaneous(longPressHint, pan);
  }, [canvasScale, dragOffsetX, dragOffsetY, handleCanvasDragStart, interactionPhase, onDragEnd]);

  const animatedDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragOffsetX.value }, { translateY: dragOffsetY.value }],
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View collapsable={false} style={animatedDragStyle}>
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
    >
      {(interactionPhase) => (
        <GraphNodeCardWrapper node={node} interactionPhase={interactionPhase}>
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
            onPress={handlePress}
          />
        </GraphNodeCardWrapper>
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
            canvasScale={canvasScale}
          />
        );
      })}
    </View>
  );
});
