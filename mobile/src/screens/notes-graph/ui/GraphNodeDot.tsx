import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import type { GraphNode } from '../lib/graphTypes';
import { GRAPH_NODE_INTERACTION_DRAGGING, GRAPH_NODE_INTERACTION_PRESSING } from './graphNodeInteraction';

const DOT_SIZE = 12;
const DOT_SIZE_ACTIVE = 16;
const DOT_SIZE_NEIGHBOR = 14;

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
    // Задачи - разные цвета в зависимости от статуса
    if (node.kind === 'task' && node.task) {
      if (node.task.isDone) {
        return color.text.tertiary; // Серый для выполненных
      }
      if (node.task.priority === 'high') {
        return '#FF3B30'; // Красный для высокого приоритета
      }
      if (node.task.priority === 'medium') {
        return '#FF9500'; // Оранжевый для среднего приоритета
      }
      return '#007AFF'; // Синий для обычных задач
    }

    // Заметки - цвет папки или акцентный цвет
    if (node.kind === 'record') {
      if (folderColor) {
        return folderColor;
      }
      if (node.record?.status === 'archived') {
        return color.text.tertiary;
      }
      return color.accent.primary;
    }

    return color.accent.primary;
  }, [node, color, folderColor]);

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
      shadowOpacity: (active || isInteracting) ? color.shadow.opacity * 0.4 : 0,
      shadowRadius: (active || isInteracting) ? 4 : 0,
      shadowOffset: { width: 0, height: 2 },
      elevation: (active || isInteracting) ? 3 : 0,
    };
  }, [active, neighbor, dimmed, dotColor, color]);

  const highlightRingStyle = useAnimatedStyle(() => {
    'worklet';
    const shouldShow = highlighted || active;

    return {
      position: 'absolute',
      width: DOT_SIZE_ACTIVE + 8,
      height: DOT_SIZE_ACTIVE + 8,
      borderRadius: (DOT_SIZE_ACTIVE + 8) / 2,
      borderWidth: 2,
      borderColor: withAlphaHex(color.accent.primary, 0.6),
      opacity: withTiming(shouldShow ? 1 : 0, { duration: 200 }),
      transform: [
        {
          scale: withTiming(shouldShow ? 1 : 0.8, { duration: 200 }),
        },
      ],
    };
  }, [highlighted, active, color]);

  return (
    <View
      style={{
        width: DOT_SIZE_ACTIVE + 8,
        height: DOT_SIZE_ACTIVE + 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      pointerEvents="none"
    >
      {(highlighted || active) ? (
        <Animated.View style={highlightRingStyle} />
      ) : null}
      <Animated.View style={containerStyle} />
    </View>
  );
});
