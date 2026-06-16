import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import type { GraphNode } from '../lib/graphTypes';
import {
  GRAPH_NODE_INTERACTION_DRAGGING,
  GRAPH_NODE_INTERACTION_PRESSING,
} from './graphNodeInteraction';

function adjustColorBrightness(hexColor: string): string {
  if (!hexColor.startsWith('#')) return hexColor;

  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness < 60) {
    return `#${Math.min(255, Math.floor(r * 1.8))
      .toString(16)
      .padStart(2, '0')}${Math.min(255, Math.floor(g * 1.8))
      .toString(16)
      .padStart(2, '0')}${Math.min(255, Math.floor(b * 1.8))
      .toString(16)
      .padStart(2, '0')}`;
  }
  if (brightness > 200) {
    return `#${Math.floor(r * 0.7)
      .toString(16)
      .padStart(2, '0')}${Math.floor(g * 0.7)
      .toString(16)
      .padStart(2, '0')}${Math.floor(b * 0.7)
      .toString(16)
      .padStart(2, '0')}`;
  }

  return hexColor;
}

export const DOT_SIZE = 20;
export const DOT_SIZE_ACTIVE = 28;
export const DOT_SIZE_NEIGHBOR = 24;

type GraphNodeDotProps = {
  node: GraphNode;
  color: Colors;
  folderColor?: string;
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
  dimmed,
  active,
  neighbor,
  highlighted,
  interactionPhase,
}: GraphNodeDotProps) {
  const dotColor = React.useMemo(() => {
    if (node.kind === 'task' && node.task) {
      if (node.task.isDone) {
        return '#8E8E93';
      }
      if (node.task.priority === 'high') {
        return '#FF453A';
      }
      if (node.task.priority === 'medium') {
        return '#FF9F0A';
      }
      return '#0A84FF';
    }

    if (node.kind === 'record') {
      if (folderColor) {
        return adjustColorBrightness(folderColor);
      }
      if (node.record?.status === 'archived') {
        return '#8E8E93';
      }
      return '#0A84FF';
    }

    return '#0A84FF';
  }, [node, folderColor]);

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

  return (
    <View
      style={{
        width: DOT_SIZE_ACTIVE + 12,
        height: DOT_SIZE_ACTIVE + 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      pointerEvents="none"
    >
      {highlighted || active ? <Animated.View style={highlightRingStyle} /> : null}
      <Animated.View style={containerStyle} />
    </View>
  );
});
