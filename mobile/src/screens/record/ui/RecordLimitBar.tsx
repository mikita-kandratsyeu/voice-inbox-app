import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import {
  RECORDING_FINAL_WARNING_REMAINING_MS,
  RECORDING_SOFT_WARNING_REMAINING_MS,
} from '@/features/app-storefront';
import { getColors, useAppTheme } from '@/shared/config';
import { logAnalyticsEvent } from '@/shared/lib/analytics';

type RecordLimitBarProps = {
  elapsedMs: number;
  maxRecordingMs: number;
};

export const RecordLimitBar = memo(({ elapsedMs, maxRecordingMs }: RecordLimitBarProps) => {
  const { t } = useTranslation();
  const scheme = useAppTheme();
  const c = getColors(scheme);

  const remainingMs = Math.max(0, maxRecordingMs - elapsedMs);

  const tone = useMemo(() => {
    if (remainingMs <= RECORDING_FINAL_WARNING_REMAINING_MS) {
      return 'final' as const;
    }
    if (remainingMs <= RECORDING_SOFT_WARNING_REMAINING_MS) {
      return 'soft' as const;
    }
    return 'calm' as const;
  }, [remainingMs]);

  const prevToneRef = useRef(tone);
  useEffect(() => {
    if (tone === 'soft' && prevToneRef.current !== 'soft') {
      void logAnalyticsEvent('recording_limit_warning_shown', { phase: 'soft' });
    }
    if (tone === 'final' && prevToneRef.current !== 'final') {
      void logAnalyticsEvent('recording_limit_warning_shown', { phase: 'final' });
    }
    prevToneRef.current = tone;
  }, [tone]);

  const remainingMins = Math.floor(remainingMs / 60000);
  const remainingSecsInMinute = Math.min(59, Math.ceil((remainingMs % 60000) / 1000));
  const lineCalm = t('record.limitRemainingCalm', {
    minutes: remainingMins,
    seconds: remainingSecsInMinute,
    maxMinutes: Math.max(1, Math.round(maxRecordingMs / 60000)),
  });
  const lineSoft = t('record.limitSoftWarning', {
    minutes: remainingMins,
    seconds: remainingSecsInMinute,
  });
  const lineFinal = t('record.limitFinalWarning', {
    seconds: Math.max(1, Math.ceil(remainingMs / 1000)),
  });

  const mainText = tone === 'final' ? lineFinal : tone === 'soft' ? lineSoft : lineCalm;
  const mainColor =
    tone === 'final'
      ? c.accent.delete
      : tone === 'soft'
        ? 'rgba(255,200,120,0.95)'
        : 'rgba(255,255,255,0.78)';

  return (
    <View className="min-h-[36px] items-center justify-center gap-1 px-2">
      <Text className="text-center text-[13px] font-medium leading-5" style={{ color: mainColor }}>
        {mainText}
      </Text>
    </View>
  );
});
