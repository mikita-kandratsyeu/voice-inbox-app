import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatTimeWithMs } from '@/shared/lib';

type RecordTimerProps = {
  elapsedMs: number;
};

export const RecordTimer = memo(({ elapsedMs }: RecordTimerProps) => {
  const formatted = formatTimeWithMs(elapsedMs);

  return (
    <View className="flex-row items-baseline">
      <Text className="text-[72px] font-light tracking-tight text-white" style={styles.tabular}>
        {formatted.main}
      </Text>
      <Text
        className="ml-0.5 text-[36px] font-light tracking-tight text-white/85"
        style={styles.tabular}
      >
        {formatted.ms}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
