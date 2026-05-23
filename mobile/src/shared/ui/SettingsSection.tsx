import React, { useContext } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';

import { SettingsSurfaceColorContext } from './SettingsSurfaceColorContext';

type SettingsSectionVariant = 'card' | 'plain';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
  variant?: SettingsSectionVariant;
};

type SettingsSectionInnerProps = SettingsSectionProps & {
  color: Colors;
};

const SettingsSectionInner = ({
  title,
  children,
  variant = 'card',
  color,
}: SettingsSectionInnerProps) => (
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

const SettingsSectionWithHook = (props: SettingsSectionProps) => {
  const color = useColors();
  return <SettingsSectionInner {...props} color={color} />;
};

export const SettingsSection = (props: SettingsSectionProps) => {
  const contextColor = useContext(SettingsSurfaceColorContext);
  if (contextColor != null) {
    return <SettingsSectionInner {...props} color={contextColor} />;
  }
  return <SettingsSectionWithHook {...props} />;
};
