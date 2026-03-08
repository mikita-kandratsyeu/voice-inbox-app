import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type SettingsSectionProps = {
  title: string;
  color: Colors;
  children: React.ReactNode;
};

export const SettingsSection = ({ title, color, children }: SettingsSectionProps) => (
  <View className="mb-6">
    <Text
      className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest"
      style={{ color: color.text.secondary }}
    >
      {title}
    </Text>
    <View
      className="overflow-hidden rounded-2xl"
      style={{ borderWidth: 1, borderColor: color.border.default }}
    >
      {children}
    </View>
  </View>
);
