import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

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
  graphWidth: number;
  graphHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  translateX: number;
  translateY: number;
  scale: number;
  disabled?: boolean;
  onNavigate: (translateX: number, translateY: number) => void;
};

function computeContentBounds(nodes: GraphNode[]) {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const bounds = nodeBounds(node);
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.right);
    maxY = Math.max(maxY, bounds.bottom);
  }

  return { minX, minY, maxX, maxY };
}

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
  graphWidth,
  graphHeight,
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
  const minimapSizeRef = useRef(minimapSize);
  const resizeStartRef = useRef(minimapSize);

  minimapSizeRef.current = minimapSize;

  const { width: minimapWidth, height: minimapHeight } = minimapSize;

  const contentBounds = useMemo(() => computeContentBounds(nodes), [nodes]);
  const worldWidth = Math.max(graphWidth, contentBounds.maxX);
  const worldHeight = Math.max(graphHeight, contentBounds.maxY);

  const miniScale = useMemo(() => {
    const scaleX = minimapWidth / worldWidth;
    const scaleY = minimapHeight / worldHeight;
    return Math.min(scaleX, scaleY);
  }, [minimapHeight, minimapWidth, worldHeight, worldWidth]);

  const viewportWorldLeft = -translateX / Math.max(scale, 0.001);
  const viewportWorldTop = -translateY / Math.max(scale, 0.001);
  const viewportWorldWidth = viewportWidth / Math.max(scale, 0.001);
  const viewportWorldHeight = viewportHeight / Math.max(scale, 0.001);

  const handlePress = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (disabled) return;
    const worldX = event.nativeEvent.locationX / miniScale;
    const worldY = event.nativeEvent.locationY / miniScale;
    const nextTranslateX = viewportWidth / 2 - worldX * scale;
    const nextTranslateY = viewportHeight / 2 - worldY * scale;
    onNavigate(nextTranslateX, nextTranslateY);
  };

  const applyResize = useCallback((nextWidth: number, nextHeight: number) => {
    const clamped = clampGraphMinimapSize(nextWidth, nextHeight);
    minimapSizeRef.current = clamped;
    setMinimapSize(clamped);
  }, []);

  const persistResize = useCallback((size: GraphMinimapSize) => {
    setGraphMinimapSize(size);
    hapticSelection();
  }, []);

  const resizeGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          resizeStartRef.current = minimapSizeRef.current;
        })
        .onUpdate((event) => {
          runOnJS(applyResize)(
            resizeStartRef.current.width - event.translationX,
            resizeStartRef.current.height + event.translationY,
          );
        })
        .onEnd(() => {
          runOnJS(persistResize)(minimapSizeRef.current);
        }),
    [applyResize, persistResize],
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
        <Svg width={minimapWidth} height={minimapHeight}>
          {nodes.map((node) => {
            const bounds = nodeBounds(node);
            return (
              <Rect
                key={node.id}
                x={bounds.left * miniScale}
                y={bounds.top * miniScale}
                width={Math.max(2, (bounds.right - bounds.left) * miniScale)}
                height={Math.max(2, (bounds.bottom - bounds.top) * miniScale)}
                fill={color.accent.primary}
                opacity={0.55}
                rx={1}
              />
            );
          })}
          <Rect
            x={viewportWorldLeft * miniScale}
            y={viewportWorldTop * miniScale}
            width={Math.max(6, viewportWorldWidth * miniScale)}
            height={Math.max(6, viewportWorldHeight * miniScale)}
            stroke={color.accent.primary}
            strokeWidth={1.5}
            fill="transparent"
          />
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
