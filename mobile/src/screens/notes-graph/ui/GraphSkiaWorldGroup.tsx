import { Group } from '@shopify/react-native-skia';
import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';

type GraphSkiaWorldGroupProps = {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  children: React.ReactNode;
  opacity?: number;
};

/** Applies the same scale + translate as the graph world Animated.View. */
export function GraphSkiaWorldGroup({
  translateX,
  translateY,
  scale,
  children,
  opacity,
}: GraphSkiaWorldGroupProps) {
  const transform = useDerivedValue(() => [
    { scale: scale.value },
    { translateX: translateX.value },
    { translateY: translateY.value },
  ]);

  return (
    <Group transform={transform} opacity={opacity}>
      {children}
    </Group>
  );
}
