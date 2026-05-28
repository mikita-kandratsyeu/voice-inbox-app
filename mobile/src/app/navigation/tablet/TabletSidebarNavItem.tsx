import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { Button } from '@/shared/ui';

import {
  TABLET_SIDEBAR_FOLDER_ITEM_HEIGHT,
  TABLET_SIDEBAR_NAV_ITEM_HEIGHT,
  TABLET_SIDEBAR_NAV_ITEM_RADIUS,
} from './tabletSidebarMetrics';
import { TabletSidebarNavBadge } from './TabletSidebarNavBadge';
import type { TabletSidebarTheme } from './tabletSidebarTheme';
import { getTabletSidebarLabelStyle } from './tabletSidebarTypography';

export type TabletSidebarNavAppearance = 'primary' | 'secondary' | 'folder';

export type TabletSidebarNavItemProps = {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  color: Colors;
  theme: TabletSidebarTheme;
  onPress: () => void;
  onLongPress?: () => void;
  appearance?: TabletSidebarNavAppearance;
  badgeCount?: number;
  accessibilityHint?: string;
  /** Folder tint when selected; defaults to accent.primary. */
  accentHex?: string;
};

function getNavItemHeight(appearance: TabletSidebarNavAppearance): number {
  return appearance === 'folder'
    ? TABLET_SIDEBAR_FOLDER_ITEM_HEIGHT
    : TABLET_SIDEBAR_NAV_ITEM_HEIGHT;
}

export function TabletSidebarNavItem({
  label,
  icon,
  isActive,
  color,
  theme,
  onPress,
  onLongPress,
  appearance = 'secondary',
  badgeCount = 0,
  accessibilityHint,
  accentHex,
}: TabletSidebarNavItemProps) {
  const accent = accentHex ?? color.accent.primary;
  const activeBg = withAlphaHex(accent, 0.16);
  const itemHeight = getNavItemHeight(appearance);
  const isNavRow = appearance === 'primary' || appearance === 'secondary';
  const labelColor = isActive ? accent : color.text.primary;

  const borderColor = isActive
    ? withAlphaHex(accent, 0.35)
    : isNavRow
      ? theme.border
      : 'transparent';

  const backgroundColor =
    appearance === 'folder'
      ? isActive
        ? activeBg
        : 'transparent'
      : isActive
        ? activeBg
        : appearance === 'primary'
          ? theme.surface
          : 'transparent';

  const containerStyle = {
    height: itemHeight,
    minHeight: itemHeight,
    borderRadius:
      appearance === 'folder' ? TABLET_SIDEBAR_NAV_ITEM_RADIUS - 2 : TABLET_SIDEBAR_NAV_ITEM_RADIUS,
    paddingVertical: 0,
    borderWidth: isNavRow ? 1 : 0,
    borderColor,
    backgroundColor,
  };

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
      trailingIcon={
        badgeCount > 0 ? (
          <TabletSidebarNavBadge
            count={badgeCount}
            color={color}
            accentHex={accentHex}
            isActive={isActive}
          />
        ) : undefined
      }
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityState={{ selected: isActive }}
      accessibilityHint={accessibilityHint}
      activeOpacity={0.85}
      className="min-h-0 px-3 py-0"
      containerStyle={containerStyle}
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
    <View className="mb-1.5 mt-2 w-full flex-row items-center justify-between px-1">
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

export function TabletSidebarSectionDivider({ color }: { color: Colors }) {
  return (
    <View
      style={{
        height: 1,
        marginTop: 12,
        marginBottom: 4,
        backgroundColor: color.border.default,
        opacity: 0.85,
      }}
    />
  );
}
