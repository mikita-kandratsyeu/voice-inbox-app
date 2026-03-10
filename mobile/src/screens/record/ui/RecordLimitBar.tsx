import React, { memo, useEffect, useRef } from 'react';
import { Animated, Text, useColorScheme } from 'react-native';

import { getColors } from '@/shared/config';

import { MAX_RECORDING_MS, WARNING_REMAINING_MS } from '../config';

type RecordLimitBarProps = {
  elapsedMs: number;
};

export const RecordLimitBar = memo(({ elapsedMs }: RecordLimitBarProps) => {
  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const c = getColors(scheme);

  const animatedOpacity = useRef(new Animated.Value(0)).current;

  const remainingMs = MAX_RECORDING_MS - elapsedMs;
  const isWarning = remainingMs <= WARNING_REMAINING_MS;

  useEffect(() => {
    if (isWarning) {
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isWarning, animatedOpacity]);

  const remainingMins = Math.ceil(remainingMs / 60000);
  const remainingSecs = Math.ceil(remainingMs / 1000);

  const warningLabel =
    remainingMs <= 60000 ? `Осталось ${remainingSecs} сек` : `Осталось ${remainingMins} мин`;

  return (
    <Animated.View style={{ opacity: animatedOpacity }}>
      <Text className="text-[12px] font-semibold" style={{ color: c.accent.delete }}>
        {warningLabel}
      </Text>
    </Animated.View>
  );
});
