import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SPRING_CONFIGS } from '@/shared/config';

const BAR_COUNT = 32;
const BAR_MIN_HEIGHT = 6;
const BAR_MAX_HEIGHT = 56;
const BAR_WIDTH = 3;
const BAR_GAP = 4;

// Create wave pattern: center bars are tallest, edges are shorter
const getWaveHeight = (index: number, intensity: number = 1) => {
  const center = BAR_COUNT / 2;
  const distanceFromCenter = Math.abs(index - center);
  const normalizedDistance = distanceFromCenter / center;

  // Create bell curve for natural voice wave shape
  const baseHeight =
    BAR_MIN_HEIGHT +
    (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) * Math.exp(-3 * normalizedDistance * normalizedDistance);

  // Add some variation
  const variation = Math.sin(index * 0.5) * 0.15 + 0.85;

  return baseHeight * variation * intensity;
};

const getBarDelay = (index: number) => {
  // Wave emanates from center outward
  const center = BAR_COUNT / 2;
  const distanceFromCenter = Math.abs(index - center);

  return distanceFromCenter * 25;
};

type WaveformProps = {
  isAnimating: boolean;
  color?: string;
};

type WaveformBarProps = {
  index: number;
  isAnimating: boolean;
  color: string;
};

const WaveformBar = memo(({ index, isAnimating, color }: WaveformBarProps) => {
  const height = useSharedValue(getWaveHeight(index, 0.3));
  const opacity = useSharedValue(0.6);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isAnimating) {
      const delay = getBarDelay(index);

      // Create pulsing wave effect with varying intensities
      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(getWaveHeight(index, 1.2), {
              duration: 350,
              easing: Easing.out(Easing.sine),
            }),
            withTiming(getWaveHeight(index, 0.6), {
              duration: 400,
              easing: Easing.inOut(Easing.sine),
            }),
            withTiming(getWaveHeight(index, 0.95), {
              duration: 380,
              easing: Easing.inOut(Easing.sine),
            }),
            withTiming(getWaveHeight(index, 0.4), {
              duration: 420,
              easing: Easing.in(Easing.sine),
            }),
          ),
          -1,
          false,
        ),
      );

      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.7, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.85, { duration: 380, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.6, { duration: 420, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );

      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.06, { duration: 350, easing: Easing.out(Easing.quad) }),
            withTiming(0.98, { duration: 400, easing: Easing.inOut(Easing.quad) }),
            withTiming(1.03, { duration: 380, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 420, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      height.value = withTiming(getWaveHeight(index, 0.3), {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(0.5, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
      scale.value = withTiming(1, {
        duration: 200,
      });
    }
  }, [isAnimating, height, opacity, scale, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    transform: [{ scaleX: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
          marginHorizontal: BAR_GAP / 2,
          width: BAR_WIDTH,
        },
        animatedStyle,
      ]}
    />
  );
});

export const Waveform = memo(({ isAnimating, color = 'rgba(255,255,255,0.7)' }: WaveformProps) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <WaveformBar key={i} index={i} isAnimating={isAnimating} color={color} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_MAX_HEIGHT + 8,
  },
  bar: {
    borderRadius: 2,
  },
});
