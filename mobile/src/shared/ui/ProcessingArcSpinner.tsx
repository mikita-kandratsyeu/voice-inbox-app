import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ANIMATION_DURATIONS, getAnimationDuration } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

const SPINNER_SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
} as const;

type ProcessingArcSpinnerSize = keyof typeof SPINNER_SIZES;

type ProcessingArcSpinnerProps = {
  color: string;
  size?: ProcessingArcSpinnerSize;
};

/** Rotating arc — same language as sidebar AI indicators. */
export function ProcessingArcSpinner({ color, size = 'md' }: ProcessingArcSpinnerProps) {
  const box = SPINNER_SIZES[size];
  const stroke = 2;
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.68;
  const center = box / 2;
  const trackTint = withAlphaHex(color, 0.22);

  const rotation = useSharedValue(0);

  useEffect(() => {
    const duration = getAnimationDuration(ANIMATION_DURATIONS.spinner);

    if (duration === 0) {
      rotation.value = 0;
    } else {
      rotation.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
    }
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={{ width: box, height: box }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      accessibilityLabel="Processing"
      accessibilityRole="progressbar"
    >
      <Animated.View style={[{ width: box, height: box }, spinStyle]}>
        <Svg width={box} height={box}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackTint}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
