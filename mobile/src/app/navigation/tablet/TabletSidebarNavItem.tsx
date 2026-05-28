import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';
import { Button } from '@/shared/ui';

import type { TabletSidebarTheme } from './tabletSidebarTheme';
import { getTabletSidebarLabelStyle } from './tabletSidebarTypography';

export type TabletSidebarNavItemProps = {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  color: Colors;
  theme: TabletSidebarTheme;
  onPress: () => void;
  onLongPress?: () => void;
  /** Folder tint when selected; defaults to accent.primary. */
  accentHex?: string;
};

export function TabletSidebarNavItem({
  label,
  icon,
  isActive,
  color,
  theme,
  onPress,
  onLongPress,
  accentHex,
}: TabletSidebarNavItemProps) {
  const accent = accentHex ?? color.accent.primary;
  const activeBg = withAlphaHex(accent, 0.16);
  const labelColor = isActive ? accent : color.text.primary;

  return (
    <Button
      variant="secondary"
      size="md"
      fullWidth
      contentAlign="start"
      color={color}
      label={label}
      labelStyle={getTabletSidebarLabelStyle(isActive, labelColor)}
      icon={icon}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityState={{ selected: isActive }}
      activeOpacity={0.85}
      className="rounded-[12px] px-3"
      containerStyle={{
        minHeight: IOS_MIN_TOUCH_TARGET + 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isActive ? withAlphaHex(accent, 0.35) : theme.border,
        backgroundColor: isActive ? activeBg : theme.surface,
        paddingVertical: 14,
      }}
    />
  );
}

/** Renders a nav icon with optional fixed tint (inactive) or accent (active). */
export function TabletSidebarNavIcon({
  children,
  isActive,
  activeColor,
  inactiveColor,
}: {
  children: React.ReactElement<{ color?: string; strokeWidth?: number; size?: number }>;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  return React.cloneElement(children, {
    color: isActive ? activeColor : inactiveColor,
    strokeWidth: 2,
    size: children.props.size ?? 21,
  });
}

export function TabletSidebarSectionLabel({
  label,
  color,
  trailing,
}: {
  label: string;
  color: Colors;
  trailing?: React.ReactNode;
}) {
  return (
    <View className="mb-1.5 mt-5 w-full flex-row items-center justify-between px-1">
      <Text
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: color.text.muted }}
      >
        {label}
      </Text>
      {trailing}
    </View>
  );
}
