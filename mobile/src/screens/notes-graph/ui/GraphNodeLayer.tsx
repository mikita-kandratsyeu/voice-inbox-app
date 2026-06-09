import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

import type { GraphNode } from '../lib/graphTypes';
import { GraphNodeCard, GraphNodeCardWrapper } from './GraphNodeCard';
import { GRAPH_NODE_LONG_PRESS_MS, type GraphNodeInteractionState } from './graphNodeInteraction';

type GraphNodeLayerProps = {
  nodes: GraphNode[];
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
  graphScale: SharedValue<number>;
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
  graphScale,
  onDragStart,
  onDragEnd,
  children,
}: {
  node: GraphNode;
  graphScale: SharedValue<number>;
  onDragStart: () => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  children: (interactionState: GraphNodeInteractionState) => React.ReactNode;
}) {
  const nodeRef = React.useRef(node);
  nodeRef.current = node;
  const dragOriginRef = React.useRef({ x: node.x, y: node.y });
  const interactionStateRef = React.useRef<GraphNodeInteractionState>('idle');
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);
  const dragScale = useSharedValue(1);

  const setInteractionState = useCallback((next: GraphNodeInteractionState) => {
    interactionStateRef.current = next;
    forceRender();
  }, []);

  useEffect(() => {
    if (interactionStateRef.current === 'dragging') return;
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
  }, [node.x, node.y, dragOffsetX, dragOffsetY]);

  const handlePressBegin = useCallback(() => {
    setInteractionState('pressing');
  }, [setInteractionState]);

  const handleDragReady = useCallback(() => {
    setInteractionState('dragging');
    hapticLight();
  }, [setInteractionState]);

  const handleInteractionEnd = useCallback(() => {
    setInteractionState('idle');
  }, [setInteractionState]);

  const handleCanvasDragStart = useCallback(() => {
    dragOriginRef.current = { x: nodeRef.current.x, y: nodeRef.current.y };
    dragScale.value = Math.max(graphScale.value, 0.001);
    dragOffsetX.value = 0;
    dragOffsetY.value = 0;
    onDragStart();
  }, [dragOffsetX, dragOffsetY, dragScale, graphScale, onDragStart]);

  const dragGesture = useMemo(() => {
    const longPressHint = Gesture.LongPress()
      .minDuration(GRAPH_NODE_LONG_PRESS_MS)
      .onBegin(() => {
        runOnJS(handlePressBegin)();
      })
      .onStart(() => {
        runOnJS(handleDragReady)();
      })
      .onFinalize(() => {
        runOnJS(handleInteractionEnd)();
      });

    const pan = Gesture.Pan()
      .activateAfterLongPress(GRAPH_NODE_LONG_PRESS_MS)
      .onBegin(() => {
        runOnJS(handleCanvasDragStart)();
      })
      .onUpdate((event) => {
        const scale = dragScale.value;
        dragOffsetX.value = event.translationX / scale;
        dragOffsetY.value = event.translationY / scale;
      })
      .onEnd((event) => {
        const current = nodeRef.current;
        const scale = dragScale.value;
        runOnJS(onDragEnd)(
          current.id,
          dragOriginRef.current.x + event.translationX / scale,
          dragOriginRef.current.y + event.translationY / scale,
        );
        runOnJS(handleInteractionEnd)();
      });

    return Gesture.Simultaneous(longPressHint, pan);
  }, [
    dragScale,
    dragOffsetX,
    dragOffsetY,
    handleCanvasDragStart,
    handleDragReady,
    handleInteractionEnd,
    handlePressBegin,
    onDragEnd,
  ]);

  const animatedDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragOffsetX.value }, { translateY: dragOffsetY.value }],
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View collapsable={false} style={animatedDragStyle}>
        {children(interactionStateRef.current)}
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
  graphScale: SharedValue<number>;
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
  graphScale,
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
      graphScale={graphScale}
      onDragStart={onNodeDragStart}
      onDragEnd={handleDragEnd}
    >
      {(interactionState) => (
        <GraphNodeCardWrapper node={node} interactionState={interactionState}>
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
            interactionState={interactionState}
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
  graphScale,
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
            graphScale={graphScale}
          />
        );
      })}
    </View>
  );
});
