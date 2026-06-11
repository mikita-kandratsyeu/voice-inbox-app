import React, { memo, useEffect, useRef } from 'react';
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
  audioLevel?: number; // 0-1, если undefined - fallback на обычную анимацию
};

type WaveformBarProps = {
  index: number;
  isAnimating: boolean;
  color: string;
  audioLevel?: number;
};

const WaveformBar = memo(({ index, isAnimating, color, audioLevel }: WaveformBarProps) => {
  const height = useSharedValue(getWaveHeight(index, 0.3));
  const opacity = useSharedValue(0.6);
  const scale = useSharedValue(1);

  // Smoothing for voice-reactive mode
  const smoothedLevel = useRef(0);
  const SMOOTHING_FACTOR = 0.3; // Lower = smoother but slower, Higher = more responsive

  useEffect(() => {
    if (isAnimating) {
      // If audioLevel is provided, use voice-reactive mode
      if (audioLevel !== undefined) {
        // Apply exponential smoothing
        smoothedLevel.current = smoothedLevel.current * (1 - SMOOTHING_FACTOR) + audioLevel * SMOOTHING_FACTOR;

        // Wave delay from center - creates ripple effect
        const center = BAR_COUNT / 2;
        const distanceFromCenter = Math.abs(index - center);
        const waveDelay = distanceFromCenter * 8; // milliseconds per bar distance

        // More dramatic intensity range with boosted response
        const boostedLevel = Math.pow(smoothedLevel.current, 0.7); // Power curve for better perception
        const targetIntensity = 0.3 + boostedLevel * 1.0; // 0.3-1.3 range

        height.value = withDelay(
          waveDelay,
          withSpring(getWaveHeight(index, targetIntensity), {
            damping: 15,
            stiffness: 180,
            mass: 0.5,
          })
        );

        opacity.value = withDelay(
          waveDelay,
          withTiming(0.5 + boostedLevel * 0.5, {
            duration: 30,
            easing: Easing.out(Easing.quad),
          })
        );

        scale.value = withDelay(
          waveDelay,
          withTiming(1 + boostedLevel * 0.12, {
            duration: 30,
            easing: Easing.out(Easing.quad),
          })
        );
      } else {
        // Fallback: animated mode when no audio data available
        const delay = getBarDelay(index);

        height.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(getWaveHeight(index, 1.2), {
                duration: 350,
                easing: Easing.out(Easing.sin),
              }),
              withTiming(getWaveHeight(index, 0.6), {
                duration: 400,
                easing: Easing.inOut(Easing.sin),
              }),
              withTiming(getWaveHeight(index, 0.95), {
                duration: 380,
                easing: Easing.inOut(Easing.sin),
              }),
              withTiming(getWaveHeight(index, 0.4), {
                duration: 420,
                easing: Easing.in(Easing.sin),
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
      }
    } else {
      // Reset smoothing on stop
      smoothedLevel.current = 0;

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
  }, [isAnimating, audioLevel, height, opacity, scale, index]);

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

export const Waveform = memo(
  ({ isAnimating, color = 'rgba(255,255,255,0.7)', audioLevel }: WaveformProps) => {
    return (
      <View style={styles.container}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <WaveformBar
            key={i}
            index={i}
            isAnimating={isAnimating}
            color={color}
            audioLevel={audioLevel}
          />
        ))}
      </View>
    );
  },
);

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
