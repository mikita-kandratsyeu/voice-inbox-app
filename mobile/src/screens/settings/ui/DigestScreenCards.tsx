import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

export type DigestMetricCardProps = {
  label: string;
  value: string;
  helper: string;
  tone: string;
};

export function DigestMetricCard({ label, value, helper, tone }: DigestMetricCardProps) {
  const color = useColors();

  return (
    <View
      className="flex-1 rounded-2xl p-4"
      style={{
        minWidth: '47%',
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: color.text.muted }}
      >
        {label}
      </Text>
      <Text className="mt-2 text-[22px] font-semibold leading-7" style={{ color: tone }}>
        {value}
      </Text>
      <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
        {helper}
      </Text>
    </View>
  );
}

export type DigestSectionCardProps = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};

export function DigestSectionCard({ title, children, icon }: DigestSectionCardProps) {
  const color = useColors();

  return (
    <View
      className="mb-7 rounded-2xl p-4"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <View className="mb-3 flex-row items-center gap-2">
        {icon}
        <Text
          className="text-[16px] font-semibold leading-[21px]"
          style={{ color: color.text.primary }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
