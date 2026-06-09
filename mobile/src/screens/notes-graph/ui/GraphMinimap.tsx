import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

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
        paddingLeft: 4,
        paddingBottom: 4,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: color.text.muted,
          opacity: 0.9,
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

  if (nodes.length < 12) return null;

  return (
    <View
      pointerEvents={disabled ? 'none' : 'box-none'}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: minimapWidth,
        height: minimapHeight,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        style={{
          flex: 1,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: color.background.primary,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        <Svg width={canvasWidth} height={canvasHeight}>
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill={color.background.secondary}
            opacity={0.55}
          />
          {nodes.map((node) => {
            const bounds = nodeBounds(node);
            const topLeft = worldToMinimapPoint(bounds.left, bounds.top, minimapFrame);
            return (
              <Rect
                key={node.id}
                x={topLeft.x}
                y={topLeft.y}
                width={Math.max(2, (bounds.right - bounds.left) * minimapFrame.scale)}
                height={Math.max(2, (bounds.bottom - bounds.top) * minimapFrame.scale)}
                fill={color.accent.primary}
                opacity={0.55}
                rx={1}
              />
            );
          })}
          {viewportMinimap.width > 0 && viewportMinimap.height > 0 ? (
            <Rect
              x={viewportMinimap.x}
              y={viewportMinimap.y}
              width={viewportMinimap.width}
              height={viewportMinimap.height}
              stroke={color.accent.primary}
              strokeWidth={GRAPH_MINIMAP_VIEWPORT_STROKE}
              fill="transparent"
            />
          ) : null}
        </Svg>
      </Pressable>

      <GestureDetector gesture={resizeGesture}>
        <View collapsable={false}>
          <MinimapResizeHandle color={color} label={t('notesGraph.minimap.resizeA11y')} />
        </View>
      </GestureDetector>
    </View>
  );
}
