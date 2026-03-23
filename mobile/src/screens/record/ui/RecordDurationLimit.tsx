import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatDurationMmSs } from '@/shared/lib';

type RecordDurationLimitProps = {
  elapsedMs: number;
  maxRecordingMs: number;
};

export const RecordDurationLimit = memo(
  ({ elapsedMs, maxRecordingMs }: RecordDurationLimitProps) => {
    const { t } = useTranslation();
    const current = formatDurationMmSs(elapsedMs);
    const max = formatDurationMmSs(maxRecordingMs);
    return (
      <View className="items-center">
        <Text
          className="text-[15px] font-medium tracking-tight text-white/75"
          style={styles.tabular}
          accessibilityLabel={t('record.limitProgress', { current, max })}
        >
          {t('record.limitProgress', { current, max })}
        </Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
