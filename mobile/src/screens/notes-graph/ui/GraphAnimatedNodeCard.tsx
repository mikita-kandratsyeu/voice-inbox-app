import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';

import type { GraphNode } from '../lib/graphTypes';
import {
  RECORD_NODE_HEIGHT,
  RECORD_NODE_WIDTH,
  TASK_NODE_HEIGHT,
  TASK_NODE_WIDTH,
} from '../lib/graphTypes';
import {
  GRAPH_NODE_INTERACTION_DRAGGING,
  GRAPH_NODE_INTERACTION_PRESSING,
} from './graphNodeInteraction';

type AnimatedNodeCardShellProps = {
  interactionPhase: SharedValue<number>;
  color: Colors;
  dimmed: boolean;
  active: boolean;
  highlighted: boolean;
  width: number;
  minHeight: number;
  borderRadius: number;
  backgroundColor: string;
  onPress?: () => void;
  children: React.ReactNode;
  taskStyle?: boolean;
};

function AnimatedNodeCardShell({
  interactionPhase,
  color,
  dimmed,
  active,
  highlighted,
  width,
  minHeight,
  borderRadius,
  backgroundColor,
  onPress,
  children,
  taskStyle = false,
}: AnimatedNodeCardShellProps) {
  const idleBorderWidth = active ? 2.5 : highlighted ? 2 : 1;
  const idleOpacity = dimmed ? 0.28 : 1;

  const animatedShellStyle = useAnimatedStyle(() => {
    const phase = interactionPhase.value;
    const dragging = phase >= GRAPH_NODE_INTERACTION_DRAGGING ? 1 : 0;
    const pressing =
      phase >= GRAPH_NODE_INTERACTION_PRESSING && phase < GRAPH_NODE_INTERACTION_DRAGGING ? 1 : 0;
    const interactive = dragging > 0 || pressing > 0;

    const scale = interpolate(phase, [0, 1, 2], [1, 0.97, 1.04]);
    const opacity = dimmed
      ? interpolate(phase, [0, 1, 2], [idleOpacity, 0.5, 1])
      : interpolate(phase, [0, 1, 2], [idleOpacity, 0.94, 1]);

    const borderWidth = dragging > 0 ? 2 : pressing > 0 ? 1.5 : idleBorderWidth;

    const shadowOpacity = dragging > 0 ? 0.16 : pressing > 0 ? 0.06 : taskStyle ? 0 : 0.08;
    const shadowRadius = dragging > 0 ? 12 : pressing > 0 ? 6 : 8;
    const elevation = dragging > 0 ? 8 : pressing > 0 ? 2 : 2;

    return {
      opacity,
      transform: [{ scale }],
      borderWidth,
      borderColor: interactive
        ? color.accent.primary
        : active || highlighted
          ? color.accent.primary
          : color.border.default,
      shadowColor: '#000',
      shadowOpacity,
      shadowRadius,
      shadowOffset: { width: 0, height: dragging > 0 ? 4 : 2 },
      elevation,
    };
  }, [
    active,
    color.accent.primary,
    color.border.default,
    dimmed,
    highlighted,
    idleBorderWidth,
    idleOpacity,
    taskStyle,
  ]);

  return (
    <Animated.View
      style={[
        {
          width,
          minHeight,
          borderRadius,
          paddingHorizontal: taskStyle ? 10 : 12,
          paddingVertical: taskStyle ? 8 : 10,
          backgroundColor,
        },
        animatedShellStyle,
      ]}
    >
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1 }}>
          {children}
        </Pressable>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </Animated.View>
  );
}

export function GraphRecordNodeCardContent({
  title,
  folderName,
  openTasksLabel,
  isUnread,
  accentColor,
  color,
}: {
  title: string;
  folderName?: string;
  openTasksLabel?: string;
  isUnread: boolean;
  accentColor: string;
  color: Colors;
}) {
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          borderRadius: 2,
          backgroundColor: accentColor,
        }}
      />
      <Text
        numberOfLines={2}
        style={{
          color: color.text.primary,
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 17,
          paddingLeft: 6,
        }}
      >
        {title}
      </Text>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 6 }}
      >
        {folderName ? (
          <Text
            numberOfLines={1}
            style={{ color: color.text.secondary, fontSize: 11, flexShrink: 1 }}
          >
            {folderName}
          </Text>
        ) : null}
        {openTasksLabel ? (
          <Text style={{ color: color.text.muted, fontSize: 11 }}>{openTasksLabel}</Text>
        ) : null}
        {isUnread ? (
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: color.accent.primary,
            }}
          />
        ) : null}
      </View>
    </>
  );
}

export function GraphTaskNodeCardContent({ text, color }: { text: string; color: Colors }) {
  return (
    <Text numberOfLines={2} style={{ color: color.text.primary, fontSize: 12, lineHeight: 15 }}>
      {text}
    </Text>
  );
}

export function GraphAnimatedNodeCard({
  interactionPhase,
  color,
  dimmed,
  active,
  highlighted,
  nodeKind,
  onPress,
  children,
}: {
  interactionPhase: SharedValue<number>;
  color: Colors;
  dimmed: boolean;
  active: boolean;
  highlighted: boolean;
  nodeKind: GraphNode['kind'];
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const isTask = nodeKind === 'task';
  const width = isTask ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;
  const minHeight = isTask ? TASK_NODE_HEIGHT : RECORD_NODE_HEIGHT;

  return (
    <AnimatedNodeCardShell
      interactionPhase={interactionPhase}
      color={color}
      dimmed={dimmed}
      active={active}
      highlighted={highlighted}
      width={width}
      minHeight={minHeight}
      borderRadius={isTask ? 10 : 14}
      backgroundColor={isTask ? color.background.tertiary : color.background.primary}
      onPress={onPress}
      taskStyle={isTask}
    >
      {children}
    </AnimatedNodeCardShell>
  );
}

export function useGraphNodeWrapperStyle(
  node: GraphNode,
  interactionPhase: SharedValue<number>,
): ReturnType<typeof useAnimatedStyle> {
  const width = node.kind === 'task' ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;

  return useAnimatedStyle(() => ({
    position: 'absolute',
    left: node.x,
    top: node.y,
    width,
    zIndex:
      interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING
        ? 20
        : interactionPhase.value >= GRAPH_NODE_INTERACTION_PRESSING
          ? 10
          : 0,
  }));
}

export function GraphNodeCardWrapper({
  node,
  interactionPhase,
  children,
}: {
  node: GraphNode;
  interactionPhase: SharedValue<number>;
  children: React.ReactNode;
}) {
  const wrapperStyle = useGraphNodeWrapperStyle(node, interactionPhase);

  return <Animated.View style={wrapperStyle}>{children}</Animated.View>;
}
