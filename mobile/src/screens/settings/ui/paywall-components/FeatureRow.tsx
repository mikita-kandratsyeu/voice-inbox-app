import { Check } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { IS_ANDROID } from '@/shared/lib/platform';
import { PLAN_PAYWALL_FEATURE_LINE_HEIGHT } from '@/shared/ui';

type FeatureRowProps = {
  color: Colors;
  text: string;
  emphasized?: boolean;
  mutedCheck?: boolean;
};

export const FeatureRow = memo(function FeatureRow({
  color,
  text,
  emphasized,
  mutedCheck,
}: FeatureRowProps) {
  const lineHeight = PLAN_PAYWALL_FEATURE_LINE_HEIGHT;
  const iconOffset = (lineHeight - 20) / 2;

  return (
    <View className="flex-row items-start">
      <View
        className="h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: mutedCheck ? color.background.tertiary : '#7E5BFF22',
          marginTop: iconOffset,
        }}
      >
        <Check
          size={12}
          color={mutedCheck ? color.text.muted : color.accent.primary}
          strokeWidth={2.4}
        />
      </View>
      <Text
        className={`flex-1 text-[13px] ${emphasized ? 'font-semibold' : ''}`}
        style={{
          marginLeft: 6,
          color: color.text.primary,
          fontSize: 13,
          lineHeight,
          ...(IS_ANDROID ? { includeFontPadding: false } : {}),
        }}
      >
        {text}
      </Text>
    </View>
  );
});
