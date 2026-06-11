import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { SPRING_CONFIGS } from '@/shared/config';

const BAR_COUNT = 32;
const BAR_MIN_HEIGHT = 6;
const BAR_MAX_HEIGHT = 56;
const BAR_WIDTH = 3;
const BAR_GAP = 4;

const randomHeight = () => BAR_MIN_HEIGHT + Math.random() * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);

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

  useEffect(() => {
    if (isAnimating) {
      height.value = withDelay(
        index * 30,
        withRepeat(
          withSequence(
            withSpring(randomHeight(), {
              ...SPRING_CONFIGS.bouncy,
              velocity: 2 + Math.random() * 3,
            }),
            withSpring(randomHeight(), {
              ...SPRING_CONFIGS.bouncy,
              velocity: 2 + Math.random() * 3,
            }),
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
    }
  }, [isAnimating, height, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
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
