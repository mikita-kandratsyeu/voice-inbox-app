import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
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

// Create unique sensitivity for each bar (seeded by index for consistency)
const getBarSensitivity = (index: number) => {
  const seed = Math.sin(index * 12.9898 + index * 78.233) * 43758.5453;
  const random = seed - Math.floor(seed);
  // Range from 0.7 to 1.3 - some bars more sensitive than others
  return 0.7 + random * 0.6;
};

// Create wave pattern: center bars are tallest, edges are shorter
const getWaveHeight = (index: number, intensity: number = 1) => {
  const center = BAR_COUNT / 2;
  const distanceFromCenter = Math.abs(index - center);
  const normalizedDistance = distanceFromCenter / center;

  // Create bell curve for natural voice wave shape
  const baseHeight =
    BAR_MIN_HEIGHT +
    (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) * Math.exp(-2.5 * normalizedDistance * normalizedDistance);

  // Individual bar variation
  const variation = getBarSensitivity(index);

  return baseHeight * variation * intensity;
};

const getBarDelay = (index: number) => {
  // Very minimal delay for wave propagation effect
  const center = BAR_COUNT / 2;
  const distanceFromCenter = Math.abs(index - center);

  // Reduced to 1-2ms per bar for near-instant feel
  return distanceFromCenter * 1.5;
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

  // Use shared values for smoothing to avoid re-renders
  const smoothedLevel = useSharedValue(0);
  const inputLevel = useSharedValue(audioLevel ?? 0);
  const barSensitivity = useRef(getBarSensitivity(index));
  const barDelay = useRef(getBarDelay(index));
  const isActive = useSharedValue(isAnimating);
  const hasAudioData = useSharedValue(audioLevel !== undefined);
  const frameCounter = useSharedValue(0);

  // Update input level on audioLevel change
  useEffect(() => {
    if (audioLevel !== undefined) {
      inputLevel.value = audioLevel;
      hasAudioData.value = true;
    } else {
      hasAudioData.value = false;
    }
  }, [audioLevel, inputLevel, hasAudioData]);

  useEffect(() => {
    isActive.value = isAnimating;
  }, [isAnimating, isActive]);

  // Use animated reaction for smooth UI thread updates
  useAnimatedReaction(
    () => {
      return { level: inputLevel.value, active: isActive.value, hasAudio: hasAudioData.value };
    },
    (current, previous) => {
      if (current.active && current.hasAudio) {
        frameCounter.value++;

        // Attack/Decay smoothing - fast rise, slow fall (like real audio envelope)
        const ATTACK = 0.85; // Very fast attack (85%)
        const DECAY = 0.3;   // Moderate decay (30%)

        const targetLevel = current.level * barSensitivity.current;

        if (targetLevel > smoothedLevel.value) {
          // Attack - very fast rise for instant response
          smoothedLevel.value = smoothedLevel.value * (1 - ATTACK) + targetLevel * ATTACK;
        } else {
          // Decay - slower fall for natural look and smoothness
          smoothedLevel.value = smoothedLevel.value * (1 - DECAY) + targetLevel * DECAY;
        }

        // Enhanced dynamic range with perceptual curve
        // Quieter sounds get boosted more for visibility
        const perceptualLevel = Math.pow(smoothedLevel.value, 0.5);
        const targetIntensity = Math.max(0.35, 0.3 + perceptualLevel * 1.3); // 0.3-1.6 range

        // Add slight micro-variations for more organic feel
        const microVariation = Math.sin(frameCounter.value * 0.1 + index) * 0.03;
        const finalIntensity = targetIntensity * (1 + microVariation);

        // Direct value assignment for instant response
        const targetHeight = getWaveHeight(index, finalIntensity);

        // Instant height update - no animation delay
        height.value = targetHeight;

        // Subtle opacity for depth
        opacity.value = 0.65 + perceptualLevel * 0.35;

        // Slight scale for emphasis on loud sounds
        scale.value = 1 + perceptualLevel * 0.06;
      }
    },
    [inputLevel, isActive, hasAudioData]
  );

  useEffect(() => {
    if (isAnimating) {
      // If audioLevel is NOT provided, use fallback animated mode
      if (audioLevel === undefined) {
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
      smoothedLevel.value = 0;

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
