import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ANIMATION_DURATIONS } from '@/shared/config';

type SkeletonPulseProps = {
  children: React.ReactNode;
};

export const SkeletonPulse = ({ children }: SkeletonPulseProps) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: ANIMATION_DURATIONS.skeletonPulse }),
        withTiming(1, { duration: ANIMATION_DURATIONS.skeletonPulse }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};
