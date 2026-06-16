import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GRAPH_SNAP_GRID_SPACING } from '../lib/graphSnapGrid';

type DottedBackgroundProps = {
  width: number;
  height: number;
  dotColor: string;
  spacing?: number;
  dotRadius?: number;
  opacity?: number;
};

export function DottedBackground({
  width,
  height,
  dotColor,
  spacing = GRAPH_SNAP_GRID_SPACING,
  dotRadius = 1.2,
  opacity = 0.42,
}: DottedBackgroundProps) {
  const dotPath = useMemo(() => {
    if (width <= 0 || height <= 0) return null;

    const builder = Skia.PathBuilder.Make();
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        builder.addCircle(x, y, dotRadius);
      }
    }
    return builder.build();
  }, [dotRadius, height, spacing, width]);

  if (!dotPath) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.layer, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Group opacity={opacity}>
          <Path path={dotPath} color={dotColor} style="fill" />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
