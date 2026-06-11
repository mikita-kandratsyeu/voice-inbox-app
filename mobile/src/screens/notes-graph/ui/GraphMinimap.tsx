import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import {
  computeMinimapViewportRect,
  computeStaticMinimapFrame,
  getMinimapCanvasSize,
  GRAPH_MINIMAP_VIEWPORT_STROKE,
  minimapToWorldPoint,
  worldToMinimapPoint,
} from '../lib/graphMinimapFrame';
import {
  clampGraphMinimapSize,
  getGraphMinimapSize,
  type GraphMinimapSize,
  setGraphMinimapSize,
} from '../lib/graphMinimapPreferences';
import { nodeBounds } from '../lib/graphNodeMetrics';
import type { GraphNode } from '../lib/graphTypes';

const RESIZE_HANDLE_SIZE = 28;

type GraphMinimapProps = {
  color: Colors;
  nodes: GraphNode[];
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  translateX: number;
  translateY: number;
  scale: number;
  disabled?: boolean;
  onNavigate: (translateX: number, translateY: number) => void;
};

function MinimapResizeHandle({ color, label }: { color: Colors; label: string }) {
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: RESIZE_HANDLE_SIZE,
        height: RESIZE_HANDLE_SIZE,
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        paddingLeft: 6,
        paddingBottom: 6,
      }}
    >
      <View
        style={{
          width: 12,
          height: 12,
          borderLeftWidth: 2.5,
          borderBottomWidth: 2.5,
          borderColor: color.accent.primary,
          opacity: 0.8,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

export function GraphMinimap({
  color,
  nodes,
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  translateX,
  translateY,
  scale,
  disabled = false,
  onNavigate,
}: GraphMinimapProps) {
  const { t } = useTranslation();
  const [minimapSize, setMinimapSize] = useState<GraphMinimapSize>(() => getGraphMinimapSize());
  const minimapWidthSV = useSharedValue(minimapSize.width);
  const minimapHeightSV = useSharedValue(minimapSize.height);
  const resizeStartWidthSV = useSharedValue(minimapSize.width);
  const resizeStartHeightSV = useSharedValue(minimapSize.height);

  useEffect(() => {
    minimapWidthSV.value = minimapSize.width;
    minimapHeightSV.value = minimapSize.height;
  }, [minimapHeightSV, minimapSize.height, minimapSize.width, minimapWidthSV]);

  const { width: minimapWidth, height: minimapHeight } = minimapSize;
  const { width: canvasWidth, height: canvasHeight } = useMemo(
    () => getMinimapCanvasSize(minimapWidth, minimapHeight),
    [minimapHeight, minimapWidth],
  );

  const minimapFrame = useMemo(
    () => computeStaticMinimapFrame(nodes, worldWidth, worldHeight, canvasWidth, canvasHeight),
    [canvasHeight, canvasWidth, nodes, worldHeight, worldWidth],
  );

  const viewportMinimap = useMemo(
    () =>
      computeMinimapViewportRect(
        minimapFrame,
        nodes,
        canvasWidth,
        canvasHeight,
        viewportWidth,
        viewportHeight,
        translateX,
        translateY,
        scale,
      ),
    [
      canvasHeight,
      canvasWidth,
      minimapFrame,
      nodes,
      scale,
      translateX,
      translateY,
      viewportHeight,
      viewportWidth,
    ],
  );

  const handlePress = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (disabled) return;
    const worldPoint = minimapToWorldPoint(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY,
      minimapFrame,
      canvasWidth,
      canvasHeight,
    );
    if (!worldPoint) return;
    const nextTranslateX = viewportWidth / 2 - worldPoint.x * scale;
    const nextTranslateY = viewportHeight / 2 - worldPoint.y * scale;
    onNavigate(nextTranslateX, nextTranslateY);
  };

  const applyResize = useCallback(
    (nextWidth: number, nextHeight: number) => {
      const clamped = clampGraphMinimapSize(nextWidth, nextHeight);
      minimapWidthSV.value = clamped.width;
      minimapHeightSV.value = clamped.height;
      setMinimapSize(clamped);
    },
    [minimapHeightSV, minimapWidthSV],
  );

  const persistResize = useCallback((width: number, height: number) => {
    setGraphMinimapSize({ width, height });
    hapticSelection();
  }, []);

  const resizeGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          'worklet';
          resizeStartWidthSV.value = minimapWidthSV.value;
          resizeStartHeightSV.value = minimapHeightSV.value;
        })
        .onUpdate((event) => {
          'worklet';
          runOnJS(applyResize)(
            resizeStartWidthSV.value - event.translationX,
            resizeStartHeightSV.value + event.translationY,
          );
        })
        .onEnd(() => {
          'worklet';
          runOnJS(persistResize)(minimapWidthSV.value, minimapHeightSV.value);
        }),
    [
      applyResize,
      minimapHeightSV,
      minimapWidthSV,
      persistResize,
      resizeStartHeightSV,
      resizeStartWidthSV,
    ],
  );

  const scaleAnimation = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
  }));

  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    scaleAnimation.value = withTiming(0.98, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
  }, [scaleAnimation]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    scaleAnimation.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [scaleAnimation]);

  if (nodes.length < 12) return null;

  return (
    <Animated.View
      pointerEvents={disabled ? 'none' : 'box-none'}
      style={[
        {
          position: 'absolute',
          top: 16,
          right: 16,
          width: minimapWidth,
          height: minimapHeight,
          opacity: disabled ? 0.55 : 1,
        },
        animatedContainerStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        style={{
          flex: 1,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: color.background.primary,
          borderWidth: 2,
          borderColor: isPressed ? color.accent.primary : color.border.default,
          shadowColor: color.shadow.color,
          shadowOpacity: isPressed ? color.shadow.opacity * 1.2 : color.shadow.opacity * 0.9,
          shadowRadius: isPressed ? 14 : 12,
          shadowOffset: { width: 0, height: isPressed ? 6 : 4 },
          elevation: isPressed ? 8 : 6,
        }}
      >
        <Svg width={canvasWidth} height={canvasHeight}>
          <Defs>
            <LinearGradient id="minimap-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color.background.secondary} stopOpacity={0.85} />
              <Stop offset="100%" stopColor={color.background.tertiary} stopOpacity={0.75} />
            </LinearGradient>
            <LinearGradient id="node-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={color.accent.primary} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={color.accent.primary} stopOpacity={0.6} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#minimap-bg)" />
          {nodes.map((node) => {
            const bounds = nodeBounds(node);
            const topLeft = worldToMinimapPoint(bounds.left, bounds.top, minimapFrame);
            const nodeWidth = Math.max(3, (bounds.right - bounds.left) * minimapFrame.scale);
            const nodeHeight = Math.max(3, (bounds.bottom - bounds.top) * minimapFrame.scale);
            const isLarge = nodeWidth > 5 && nodeHeight > 5;
            return (
              <React.Fragment key={node.id}>
                {isLarge && (
                  <Circle
                    cx={topLeft.x + nodeWidth / 2}
                    cy={topLeft.y + nodeHeight / 2}
                    r={Math.max(nodeWidth, nodeHeight) * 0.8}
                    fill={color.accent.primary}
                    opacity={0.15}
                  />
                )}
                <Rect
                  x={topLeft.x}
                  y={topLeft.y}
                  width={nodeWidth}
                  height={nodeHeight}
                  fill="url(#node-gradient)"
                  rx={2}
                />
              </React.Fragment>
            );
          })}
          {viewportMinimap.width > 0 && viewportMinimap.height > 0 ? (
            <>
              <Rect
                x={viewportMinimap.x}
                y={viewportMinimap.y}
                width={viewportMinimap.width}
                height={viewportMinimap.height}
                fill={color.accent.primary}
                opacity={0.12}
                rx={2}
              />
              <Rect
                x={viewportMinimap.x}
                y={viewportMinimap.y}
                width={viewportMinimap.width}
                height={viewportMinimap.height}
                stroke={color.accent.primary}
                strokeWidth={GRAPH_MINIMAP_VIEWPORT_STROKE * 1.4}
                fill="transparent"
                opacity={1}
                rx={2}
              />
            </>
          ) : null}
        </Svg>
      </Pressable>

      <GestureDetector gesture={resizeGesture}>
        <View collapsable={false}>
          <MinimapResizeHandle color={color} label={t('notesGraph.minimap.resizeA11y')} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
