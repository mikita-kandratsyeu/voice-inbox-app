import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type ProgressStatusCardProps = {
  title: string;
  subtitle?: React.ReactNode;
};

/** Centered loading card — same shell as auto-organize and import progress overlays. */
export function ProgressStatusCard({ title, subtitle }: ProgressStatusCardProps) {
  const color = useColors();

  return (
    <View
      className="w-full max-w-sm rounded-2xl px-6 py-8"
      style={{
        backgroundColor: color.background.card,
        borderWidth: 1,
        borderColor: color.border.default,
        shadowColor: color.shadow.color,
        shadowOpacity: color.shadow.opacity,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View className="items-center justify-center">
        <ActivityIndicator size="large" color={color.accent.primary} />
      </View>
      <Text
        className="mt-5 text-center text-[16px] font-semibold leading-6"
        style={{ color: color.text.primary }}
      >
        {title}
      </Text>
      {subtitle != null ? <View className="mt-2 items-center">{subtitle}</View> : null}
    </View>
  );
}
