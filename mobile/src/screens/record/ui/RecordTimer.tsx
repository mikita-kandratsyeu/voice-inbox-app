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
      <Text className="text-[84px] font-normal tracking-[-2px] text-white" style={styles.tabular}>
        {formatted.main}
      </Text>
      <Text
        className="ml-1 text-[38px] font-light tracking-[-1px]"
        style={[styles.tabular, { color: 'rgba(255,255,255,0.62)' }]}
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
