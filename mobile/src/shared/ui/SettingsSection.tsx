import React, { useContext } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';

import { ProCrownBadge } from './ProCrownBadge';
import { SettingsSurfaceColorContext } from './SettingsSurfaceColorContext';

type SettingsSectionVariant = 'card' | 'plain';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
  variant?: SettingsSectionVariant;
  /** Crown + Pro label beside the section title (e.g. locked Pro-only sections for free users). */
  showTitleProBadge?: boolean;
};

type SettingsSectionInnerProps = SettingsSectionProps & {
  color: Colors;
};

const SettingsSectionTitle = ({
  title,
  color,
  showTitleProBadge,
}: {
  title: string;
  color: Colors;
  showTitleProBadge: boolean;
}) => {
  if (!showTitleProBadge) {
    return (
      <Text
        className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
        style={{ color: color.text.secondary }}
      >
        {title}
      </Text>
    );
  }

  return (
    <View className="mb-2.5 flex-row items-center gap-1.5 px-1">
      <Text
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: color.text.secondary }}
      >
        {title}
      </Text>
      <ProCrownBadge />
    </View>
  );
};

const SettingsSectionInner = ({
  title,
  children,
  variant = 'card',
  color,
  showTitleProBadge = false,
}: SettingsSectionInnerProps) => (
  <View className="mb-7">
    <SettingsSectionTitle title={title} color={color} showTitleProBadge={showTitleProBadge} />
    {variant === 'plain' ? (
      <View>{children}</View>
    ) : (
      <View
        className="overflow-hidden rounded-2xl"
        style={{
          borderWidth: 1,
          borderColor: color.border.default,
          backgroundColor: color.background.card,
        }}
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
