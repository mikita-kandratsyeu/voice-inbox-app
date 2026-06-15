import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Colors } from '@/shared/config';
import { hapticSelection, withAlphaHex } from '@/shared/lib';

import { buildMinimapNodeItems } from '../lib/buildMinimapNodeItems';
import { computeMinimapViewportRectWorklet } from '../lib/graphMinimapViewportWorklet';
import {
  computeMinimapContentBounds,
  computeStaticMinimapFrame,
  getMinimapCanvasSize,
  GRAPH_MINIMAP_VIEWPORT_STROKE,
  type GraphMinimapContentBounds,
  type GraphMinimapFrame,
  minimapToWorldPoint,
} from '../lib/graphMinimapFrame';
import {
  clampGraphMinimapSize,
  getGraphMinimapSize,
  type GraphMinimapSize,
  isGraphMinimapAvailable,
  setGraphMinimapSize,
} from '../lib/graphMinimapPreferences';
import type { GraphNode } from '../lib/graphTypes';

const RESIZE_HANDLE_SIZE = 28;
const VIEWPORT_STROKE_WIDTH = GRAPH_MINIMAP_VIEWPORT_STROKE * 1.4;

type GraphMinimapProps = {
  color: Colors;
  nodes: GraphNode[];
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
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

type MinimapViewportIndicatorProps = {
  frame: GraphMinimapFrame;
  contentBounds: GraphMinimapContentBounds | null;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  accentColor: string;
};

function MinimapViewportIndicator({
  frame,
  contentBounds,
  canvasWidth,
  canvasHeight,
  viewportWidth,
  viewportHeight,
  translateX,
  translateY,
  scale,
  accentColor,
}: MinimapViewportIndicatorProps) {
  const viewportRect = useDerivedValue(() =>
    computeMinimapViewportRectWorklet(
      frame,
      contentBounds,
      canvasWidth,
      canvasHeight,
      viewportWidth,
      viewportHeight,
      translateX.value,
      translateY.value,
      scale.value,
    ),
  );

  const viewportX = useDerivedValue(() => viewportRect.value.x);
  const viewportY = useDerivedValue(() => viewportRect.value.y);
  const viewportWidthSV = useDerivedValue(() => viewportRect.value.width);
  const viewportHeightSV = useDerivedValue(() => viewportRect.value.height);

  return (
    <Group>
      <RoundedRect
        x={viewportX}
        y={viewportY}
        width={viewportWidthSV}
        height={viewportHeightSV}
        r={2}
        color={accentColor}
        opacity={0.12}
      />
      <RoundedRect
        x={viewportX}
        y={viewportY}
        width={viewportWidthSV}
        height={viewportHeightSV}
        r={2}
        style="stroke"
        strokeWidth={VIEWPORT_STROKE_WIDTH}
        color={accentColor}
      />
    </Group>
  );
}

type GraphMinimapCanvasProps = {
  color: Colors;
  nodeItems: ReturnType<typeof buildMinimapNodeItems>;
  frame: GraphMinimapFrame;
  contentBounds: GraphMinimapContentBounds | null;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
};

function GraphMinimapCanvas({
  color,
  nodeItems,
  frame,
  contentBounds,
  canvasWidth,
  canvasHeight,
  viewportWidth,
  viewportHeight,
  translateX,
  translateY,
  scale,
}: GraphMinimapCanvasProps) {
  const nodeGradientStart = color.accent.primary;
  const nodeGradientEnd = withAlphaHex(color.accent.primary, 0.6);

  return (
    <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
      <RoundedRect x={0} y={0} width={canvasWidth} height={canvasHeight} r={0}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, canvasHeight)}
          colors={[
            withAlphaHex(color.background.secondary, 0.85),
            withAlphaHex(color.background.tertiary, 0.75),
          ]}
        />
      </RoundedRect>

      {nodeItems.map((item) => (
        <Group key={item.id}>
          {item.showGlow ? (
            <Circle
              cx={item.glowCx}
              cy={item.glowCy}
              r={item.glowRadius}
              color={color.accent.primary}
              opacity={0.15}
            />
          ) : null}
          <RoundedRect x={item.x} y={item.y} width={item.width} height={item.height} r={2}>
            <LinearGradient
              start={vec(item.x, item.y)}
              end={vec(item.x + item.width, item.y + item.height)}
              colors={[nodeGradientStart, nodeGradientEnd]}
            />
          </RoundedRect>
        </Group>
      ))}

      <MinimapViewportIndicator
        frame={frame}
        contentBounds={contentBounds}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
        translateX={translateX}
        translateY={translateY}
        scale={scale}
        accentColor={color.accent.primary}
      />
    </Canvas>
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

  const contentBounds = useMemo(() => computeMinimapContentBounds(nodes), [nodes]);

  const nodeItems = useMemo(
    () => buildMinimapNodeItems(nodes, minimapFrame),
    [minimapFrame, nodes],
  );

  const handlePress = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (disabled) return;

      const worldPoint = minimapToWorldPoint(
        event.nativeEvent.locationX,
        event.nativeEvent.locationY,
        minimapFrame,
        canvasWidth,
        canvasHeight,
      );
      if (!worldPoint) return;

      const currentScale = scale.value;
      onNavigate(
        viewportWidth / 2 - worldPoint.x * currentScale,
        viewportHeight / 2 - worldPoint.y * currentScale,
      );
    },
    [
      canvasHeight,
      canvasWidth,
      disabled,
      minimapFrame,
      onNavigate,
      scale,
      viewportHeight,
      viewportWidth,
    ],
  );

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
          scheduleOnRN(
            applyResize,
            resizeStartWidthSV.value - event.translationX,
            resizeStartHeightSV.value + event.translationY,
          );
        })
        .onEnd(() => {
          'worklet';
          scheduleOnRN(persistResize, minimapWidthSV.value, minimapHeightSV.value);
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

  if (!isGraphMinimapAvailable(nodes.length)) return null;

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
        <GraphMinimapCanvas
          color={color}
          nodeItems={nodeItems}
          frame={minimapFrame}
          contentBounds={contentBounds}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          translateX={translateX}
          translateY={translateY}
          scale={scale}
        />
      </Pressable>

      <GestureDetector gesture={resizeGesture}>
        <View collapsable={false}>
          <MinimapResizeHandle color={color} label={t('notesGraph.minimap.resizeA11y')} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
