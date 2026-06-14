import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { FILTER_CHIP_LABEL_STYLE, filterChipRowStyle } from '@/shared/ui/filterChipMetrics';

import type { DigestPeriod } from '../lib/digest';

const PERIOD_ITEMS: DigestPeriod[] = ['day', 'week', 'month', 'all'];

const CHIP_MIN_HEIGHT = 40;
const CHIP_GAP = 8;

type Props = {
  period: DigestPeriod;
  onChange: (period: DigestPeriod) => void;
};

export function DigestPeriodFilter({ period, onChange }: Props) {
  const { t } = useTranslation();
  const color = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-5"
      contentContainerStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: CHIP_GAP,
        paddingVertical: 2,
      }}
    >
      {PERIOD_ITEMS.map((item) => {
        const selected = item === period;
        const backgroundColor = selected ? color.accent.primary : color.background.card;
        const borderColor = selected ? color.accent.primary : color.border.default;
        const foregroundColor = selected ? color.icon.onAccent : color.text.primary;

        return (
          <TouchableOpacity
            key={item}
            onPress={() => {
              hapticSelection();
              onChange(item);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t(`settings.digest.period.${item}`)}
            style={[
              filterChipRowStyle(backgroundColor, borderColor),
              {
                marginRight: 0,
                minHeight: CHIP_MIN_HEIGHT,
                paddingHorizontal: 14,
                paddingVertical: 8,
              },
            ]}
          >
            <Text
              style={{ ...FILTER_CHIP_LABEL_STYLE, color: foregroundColor }}
              numberOfLines={1}
            >
              {t(`settings.digest.periodTab.${item}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
