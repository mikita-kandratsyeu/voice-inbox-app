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

const randomHeight = () => BAR_MIN_HEIGHT + Math.random() * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);

const randomVelocity = () => 1.5 + Math.random() * 2.5;

const getBarDelay = (index: number) => {
  const groupSize = 4;
  const group = Math.floor(index / groupSize);
  const positionInGroup = index % groupSize;

  return group * 40 + positionInGroup * 10;
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
  const height = useSharedValue(randomHeight());
  const opacity = useSharedValue(0.7);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isAnimating) {
      const delay = getBarDelay(index);

      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withSpring(randomHeight(), {
              ...SPRING_CONFIGS.bouncy,
              velocity: randomVelocity(),
            }),
            withSpring(randomHeight(), {
              ...SPRING_CONFIGS.bouncy,
              velocity: randomVelocity(),
            }),
            withSpring(randomHeight(), {
              ...SPRING_CONFIGS.bouncy,
              velocity: randomVelocity(),
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
            withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.65, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.85, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );

      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(1.08, { duration: 200, easing: Easing.out(Easing.quad) }),
            withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      height.value = withSpring(BAR_MIN_HEIGHT + 4, {
        damping: 10,
        stiffness: 200,
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
