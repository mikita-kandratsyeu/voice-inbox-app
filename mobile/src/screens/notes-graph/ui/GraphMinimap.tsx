import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import { Maximize2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';
import {
  GestureDetector,
  type PanGestureActiveEvent,
  usePanGesture,
} from 'react-native-gesture-handler';
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
import { hapticLight, hapticSelection, withAlphaHex } from '@/shared/lib';

import { buildMinimapNodeItems } from '../lib/buildMinimapNodeItems';
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
  getGraphMinimapPresetSize,
  getGraphMinimapSize,
  type GraphMinimapSize,
  type GraphMinimapSizePreset,
  isGraphMinimapAvailable,
  resolveGraphMinimapPreset,
  resolveGraphMinimapResizeLimits,
  setGraphMinimapSize,
} from '../lib/graphMinimapPreferences';
import { computeMinimapViewportRectWorklet } from '../lib/graphMinimapViewportWorklet';
import type { GraphNode } from '../lib/graphTypes';

const RESIZE_HANDLE_SIZE = 36;
const MINIMAP_LONG_PRESS_MS = 400;
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

type MinimapResizeHandleProps = {
  color: Colors;
  label: string;
  hint: string;
  active: boolean;
};

function MinimapResizeHandle({ color, label, hint, active }: MinimapResizeHandleProps) {
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: RESIZE_HANDLE_SIZE,
        height: RESIZE_HANDLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active
            ? withAlphaHex(color.accent.primary, 0.14)
            : color.background.primary,
          borderWidth: 1.5,
          borderColor: active ? color.accent.primary : color.border.default,
          shadowColor: color.shadow.color,
          shadowOpacity: color.shadow.opacity * 0.45,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <Maximize2
          size={15}
          color={active ? color.accent.primary : color.text.secondary}
          strokeWidth={2.2}
        />
      </View>
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
  const [isResizing, setIsResizing] = useState(false);
  const minimapWidthSV = useSharedValue(minimapSize.width);
  const minimapHeightSV = useSharedValue(minimapSize.height);
  const resizeStartWidthSV = useSharedValue(minimapSize.width);
  const resizeStartHeightSV = useSharedValue(minimapSize.height);
  const longPressHandledRef = useRef(false);
  const resizeLimitHapticRef = useRef<{
    width: 'min' | 'max' | null;
    height: 'min' | 'max' | null;
  }>({ width: null, height: null });
  const resizePersistedRef = useRef(false);

  useEffect(() => {
    minimapWidthSV.value = minimapSize.width;
    minimapHeightSV.value = minimapSize.height;
  }, [minimapHeightSV, minimapSize.height, minimapSize.width, minimapWidthSV]);

  const { width: minimapWidth, height: minimapHeight } = minimapSize;
  const activePreset = useMemo(() => resolveGraphMinimapPreset(minimapSize), [minimapSize]);
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

  const persistResize = useCallback((width: number, height: number) => {
    setGraphMinimapSize({ width, height });
    hapticSelection();
  }, []);

  const applyResize = useCallback(
    (nextWidth: number, nextHeight: number, options?: { persist?: boolean }) => {
      const limits = resolveGraphMinimapResizeLimits(nextWidth, nextHeight);
      const clamped = clampGraphMinimapSize(nextWidth, nextHeight);

      if (limits.width && resizeLimitHapticRef.current.width !== limits.width) {
        hapticLight();
        resizeLimitHapticRef.current.width = limits.width;
      } else if (!limits.width) {
        resizeLimitHapticRef.current.width = null;
      }

      if (limits.height && resizeLimitHapticRef.current.height !== limits.height) {
        hapticLight();
        resizeLimitHapticRef.current.height = limits.height;
      } else if (!limits.height) {
        resizeLimitHapticRef.current.height = null;
      }

      minimapWidthSV.value = clamped.width;
      minimapHeightSV.value = clamped.height;
      setMinimapSize(clamped);

      if (options?.persist) {
        persistResize(clamped.width, clamped.height);
      }
    },
    [minimapHeightSV, minimapWidthSV, persistResize],
  );

  const applyPreset = useCallback(
    (preset: GraphMinimapSizePreset) => {
      const next = getGraphMinimapPresetSize(preset);
      resizeLimitHapticRef.current = { width: null, height: null };
      applyResize(next.width, next.height, { persist: true });
    },
    [applyResize],
  );

  const showSizePresets = useCallback(() => {
    if (disabled) return;

    Alert.alert(t('notesGraph.minimap.sizePresetsTitle'), undefined, [
      {
        text: t('notesGraph.minimap.sizeSmall'),
        onPress: () => applyPreset('small'),
      },
      {
        text: t('notesGraph.minimap.sizeMedium'),
        onPress: () => applyPreset('medium'),
      },
      {
        text: t('notesGraph.minimap.sizeLarge'),
        onPress: () => applyPreset('large'),
      },
      { text: t('common.cancel'), style: 'destructive' },
    ]);
  }, [applyPreset, disabled, t]);

  const handlePress = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (disabled || isResizing || longPressHandledRef.current) {
        longPressHandledRef.current = false;
        return;
      }

      const worldPoint = minimapToWorldPoint(
        event.nativeEvent.locationX,
        event.nativeEvent.locationY,
        minimapFrame,
        canvasWidth,
        canvasHeight,
      );
      if (!worldPoint) return;

      hapticLight();
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
      isResizing,
      minimapFrame,
      onNavigate,
      scale,
      viewportHeight,
      viewportWidth,
    ],
  );

  const handleResizeBegin = useCallback(() => {
    resizeLimitHapticRef.current = { width: null, height: null };
    resizePersistedRef.current = false;
    setIsResizing(true);
  }, []);

  const handleResizeEnd = useCallback(
    (width: number, height: number) => {
      resizeLimitHapticRef.current = { width: null, height: null };
      setIsResizing(false);
      if (resizePersistedRef.current) return;
      resizePersistedRef.current = true;
      persistResize(width, height);
    },
    [persistResize],
  );

  const resizeGesture = usePanGesture({
    onBegin: () => {
      'worklet';
      resizeStartWidthSV.value = minimapWidthSV.value;
      resizeStartHeightSV.value = minimapHeightSV.value;
      scheduleOnRN(handleResizeBegin);
    },
    onUpdate: (event: PanGestureActiveEvent) => {
      'worklet';
      scheduleOnRN(
        applyResize,
        resizeStartWidthSV.value + event.translationX,
        resizeStartHeightSV.value + event.translationY,
      );
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(handleResizeEnd, minimapWidthSV.value, minimapHeightSV.value);
    },
  });

  const scaleAnimation = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (isResizing) return;
    setIsPressed(true);
    scaleAnimation.value = withTiming(0.98, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
  }, [isResizing, scaleAnimation]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    scaleAnimation.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [scaleAnimation]);

  const handleLongPress = useCallback(() => {
    if (disabled || isResizing) return;
    longPressHandledRef.current = true;
    hapticSelection();
    showSizePresets();
  }, [disabled, isResizing, showSizePresets]);

  if (!isGraphMinimapAvailable(nodes.length)) return null;

  const presetLabelKey =
    activePreset === 'small'
      ? 'notesGraph.minimap.sizeSmall'
      : activePreset === 'large'
        ? 'notesGraph.minimap.sizeLarge'
        : 'notesGraph.minimap.sizeMedium';

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
        onLongPress={handleLongPress}
        delayLongPress={MINIMAP_LONG_PRESS_MS}
        disabled={disabled || isResizing}
        accessibilityRole="button"
        accessibilityLabel={t('notesGraph.minimap.navigateA11y')}
        accessibilityHint={t('notesGraph.minimap.longPressSizeHint')}
        accessibilityState={{ disabled: disabled || isResizing }}
        style={{
          flex: 1,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: color.background.primary,
          borderWidth: 2,
          borderColor: isPressed || isResizing ? color.accent.primary : color.border.default,
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
        <View collapsable={false} pointerEvents="box-only">
          <MinimapResizeHandle
            color={color}
            active={isResizing}
            label={t('notesGraph.minimap.resizeA11y', { size: t(presetLabelKey) })}
            hint={t('notesGraph.minimap.resizeHint')}
          />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
