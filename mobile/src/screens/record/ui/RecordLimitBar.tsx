import React, { memo, useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { getColors, useAppTheme } from '@/shared/config';

import { MAX_RECORDING_MS, WARNING_REMAINING_MS } from '../config';

type RecordLimitBarProps = {
  elapsedMs: number;
};

export const RecordLimitBar = memo(({ elapsedMs }: RecordLimitBarProps) => {
  const scheme = useAppTheme();
  const c = getColors(scheme);

  const opacity = useSharedValue(0);

  const remainingMs = MAX_RECORDING_MS - elapsedMs;
  const isWarning = remainingMs <= WARNING_REMAINING_MS;

  useEffect(() => {
    if (isWarning) {
      opacity.value = withTiming(1, { duration: 400 });
    }
  }, [isWarning, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const remainingMins = Math.ceil(remainingMs / 60000);
  const remainingSecs = Math.ceil(remainingMs / 1000);

  const warningLabel =
    remainingMs <= 60000 ? `Осталось ${remainingSecs} сек` : `Осталось ${remainingMins} мин`;

  return (
    <Animated.View style={animatedStyle}>
      <Text className="text-[12px] font-semibold" style={{ color: c.accent.delete }}>
        {warningLabel}
      </Text>
    </Animated.View>
  );
});
