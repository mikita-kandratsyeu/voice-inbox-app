import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type SettingsSectionVariant = 'card' | 'plain';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
  variant?: SettingsSectionVariant;
};

export const SettingsSection = ({ title, children, variant = 'card' }: SettingsSectionProps) => {
  const color = useColors();
  return (
    <View className="mb-7">
      <Text
        className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
        style={{ color: color.text.secondary }}
      >
        {title}
      </Text>
      {variant === 'plain' ? (
        <View>{children}</View>
      ) : (
        <View
          className="overflow-hidden rounded-2xl"
          style={{ borderWidth: 1, borderColor: color.border.default }}
        >
          {children}
        </View>
      )}
    </View>
  );
};
