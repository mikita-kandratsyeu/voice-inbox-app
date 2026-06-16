import React from 'react';
import { Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { resolveDisplayFolderColor, withAlphaHex } from '@/shared/lib';

import {
  GRAPH_NODE_DOT_CONTAINER_SIZE,
  GRAPH_NODE_DOT_LABEL_FONT_SIZE,
  GRAPH_NODE_DOT_LABEL_GAP,
  GRAPH_NODE_DOT_LABEL_MAX_WIDTH,
  GRAPH_NODE_DOT_SIZE,
  GRAPH_NODE_DOT_SIZE_ACTIVE,
  GRAPH_NODE_DOT_SIZE_NEIGHBOR,
} from '../lib/graphNodeDotLayout';
import type { GraphNode } from '../lib/graphTypes';
import { resolveGraphNodeDotLabel } from '../lib/resolveGraphNodeDotLabel';
import {
  GRAPH_NODE_INTERACTION_DRAGGING,
  GRAPH_NODE_INTERACTION_PRESSING,
} from './graphNodeInteraction';

export const DOT_SIZE = GRAPH_NODE_DOT_SIZE;
export const DOT_SIZE_ACTIVE = GRAPH_NODE_DOT_SIZE_ACTIVE;
export const DOT_SIZE_NEIGHBOR = GRAPH_NODE_DOT_SIZE_NEIGHBOR;
export const DOT_CONTAINER_SIZE = GRAPH_NODE_DOT_CONTAINER_SIZE;

type GraphNodeDotProps = {
  node: GraphNode;
  color: Colors;
  folderColor?: string;
  isProActive: boolean;
  dimmed: boolean;
  active: boolean;
  neighbor: boolean;
  highlighted: boolean;
  interactionPhase: SharedValue<number>;
};

export const GraphNodeDot = React.memo(function GraphNodeDot({
  node,
  color,
  folderColor,
  isProActive,
  dimmed,
  active,
  neighbor,
  highlighted,
  interactionPhase,
}: GraphNodeDotProps) {
  const label = React.useMemo(() => resolveGraphNodeDotLabel(node), [node]);

  const dotColor = React.useMemo(() => {
    if (node.kind === 'task' && node.task) {
      if (node.task.isDone) {
        return color.text.muted;
      }
      if (node.task.priority === 'high') {
        return color.accent.delete;
      }
      if (node.task.priority === 'medium') {
        return color.accent.cache;
      }
      return color.accent.primary;
    }

    if (node.kind === 'record') {
      if (folderColor) {
        return resolveDisplayFolderColor(folderColor, isProActive);
      }
      if (node.record?.status === 'archived') {
        return color.accent.archive;
      }
      return color.accent.primary;
    }

    return color.accent.primary;
  }, [node, color, folderColor, isProActive]);

  const highlightRingBorderColor = React.useMemo(
    () => withAlphaHex(color.accent.primary, 0.6),
    [color.accent.primary],
  );

  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    const isInteracting = interactionPhase.value >= GRAPH_NODE_INTERACTION_PRESSING;
    const isDragging = interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING;

    let size = DOT_SIZE;
    if (active || isInteracting) {
      size = DOT_SIZE_ACTIVE;
    } else if (neighbor) {
      size = DOT_SIZE_NEIGHBOR;
    }

    const baseOpacity = dimmed ? 0.3 : 1;
    const opacity = isDragging ? 0.8 : baseOpacity;

    return {
      width: withTiming(size, { duration: 200 }),
      height: withTiming(size, { duration: 200 }),
      borderRadius: size / 2,
      backgroundColor: dotColor,
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [
        {
          scale: withTiming(isDragging ? 1.1 : 1, { duration: 200 }),
        },
      ],
      shadowColor: color.shadow.color,
      shadowOpacity: active || isInteracting ? color.shadow.opacity * 0.4 : 0,
      shadowRadius: active || isInteracting ? 4 : 0,
      shadowOffset: { width: 0, height: 2 },
      elevation: active || isInteracting ? 3 : 0,
    };
  }, [active, neighbor, dimmed, dotColor, color]);

  const highlightRingStyle = useAnimatedStyle(() => {
    'worklet';
    const shouldShow = highlighted || active;

    return {
      position: 'absolute',
      width: DOT_SIZE_ACTIVE + 12,
      height: DOT_SIZE_ACTIVE + 12,
      borderRadius: (DOT_SIZE_ACTIVE + 12) / 2,
      borderWidth: 2,
      borderColor: highlightRingBorderColor,
      opacity: withTiming(shouldShow ? 1 : 0, { duration: 200 }),
      transform: [
        {
          scale: withTiming(shouldShow ? 1 : 0.8, { duration: 200 }),
        },
      ],
    };
  }, [highlighted, active, highlightRingBorderColor]);

  const labelStyle = React.useMemo(
    () => ({
      marginTop: GRAPH_NODE_DOT_LABEL_GAP,
      marginLeft: (GRAPH_NODE_DOT_CONTAINER_SIZE - GRAPH_NODE_DOT_LABEL_MAX_WIDTH) / 2,
      width: GRAPH_NODE_DOT_LABEL_MAX_WIDTH,
      fontSize: GRAPH_NODE_DOT_LABEL_FONT_SIZE,
      fontWeight: '500' as const,
      lineHeight: GRAPH_NODE_DOT_LABEL_FONT_SIZE + 3,
      textAlign: 'center' as const,
      color:
        active || highlighted
          ? color.text.primary
          : neighbor
            ? color.text.secondary
            : color.text.muted,
      opacity: dimmed ? 0.35 : active || highlighted || neighbor ? 1 : 0.88,
      textShadowColor: withAlphaHex(color.background.primary, 0.92),
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
    }),
    [
      active,
      color.background.primary,
      color.text.muted,
      color.text.primary,
      color.text.secondary,
      dimmed,
      highlighted,
      neighbor,
    ],
  );

  return (
    <View style={{ width: GRAPH_NODE_DOT_CONTAINER_SIZE }} pointerEvents="none">
      <View
        style={{
          width: GRAPH_NODE_DOT_CONTAINER_SIZE,
          height: GRAPH_NODE_DOT_CONTAINER_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {highlighted || active ? <Animated.View style={highlightRingStyle} /> : null}
        <Animated.View style={containerStyle} />
      </View>
      {label ? (
        <Text style={labelStyle} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      ) : null}
    </View>
  );
});
