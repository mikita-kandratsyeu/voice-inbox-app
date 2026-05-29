import React, { useEffect } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { Button } from '@/shared/ui';

import type { TabletSidebarAiOperationKind } from './classifySidebarRecordAiOperation';
import {
  TABLET_SIDEBAR_FOLDER_ITEM_HEIGHT,
  TABLET_SIDEBAR_NAV_ITEM_HEIGHT,
  TABLET_SIDEBAR_NAV_ITEM_RADIUS,
} from './tabletSidebarMetrics';
import { TabletSidebarNavBadge } from './TabletSidebarNavBadge';
import { TabletSidebarNavProcessingIndicator } from './TabletSidebarNavProcessingIndicator';
import { TabletSidebarNavUnreadDot } from './TabletSidebarNavUnreadDot';
import type { TabletSidebarTheme } from './tabletSidebarTheme';
import { getTabletSidebarLabelStyle } from './tabletSidebarTypography';

export type TabletSidebarNavAppearance = 'primary' | 'secondary' | 'folder' | 'ghost';

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
  showUnreadDot?: boolean;
  showProcessingIndicator?: boolean;
  processingKind?: TabletSidebarAiOperationKind | null;
  accessibilityHint?: string;
  /** Folder tint when selected; defaults to accent.primary. */
  accentHex?: string;
};

function getNavItemHeight(appearance: TabletSidebarNavAppearance): number {
  if (appearance === 'folder') return TABLET_SIDEBAR_FOLDER_ITEM_HEIGHT;
  return TABLET_SIDEBAR_NAV_ITEM_HEIGHT;
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
  showUnreadDot = false,
  showProcessingIndicator = false,
  processingKind = null,
  accessibilityHint,
  accentHex,
}: TabletSidebarNavItemProps) {
  const accent = accentHex ?? color.accent.primary;
  const processingAccent = color.status.processing.text;
  const activeBg = withAlphaHex(accent, 0.16);
  const activeProcessingBg = withAlphaHex(processingAccent, 0.14);
  const isGhost = appearance === 'ghost';
  const showAiPulse = isActive && showProcessingIndicator && !isGhost;
  const borderPulse = useSharedValue(0);
  const itemHeight = getNavItemHeight(appearance);
  const isNavRow = appearance === 'primary' || appearance === 'secondary';
  const labelColor = isGhost
    ? isActive
      ? accent
      : color.text.secondary
    : isActive
      ? accent
      : color.text.primary;

  const borderColor = isActive
    ? withAlphaHex(showAiPulse ? processingAccent : accent, 0.35)
    : isNavRow
      ? theme.border
      : 'transparent';

  const backgroundColor = isGhost
    ? 'transparent'
    : appearance === 'folder'
      ? isActive
        ? showAiPulse
          ? activeProcessingBg
          : activeBg
        : 'transparent'
      : isActive
        ? showAiPulse
          ? activeProcessingBg
          : activeBg
        : appearance === 'primary'
          ? theme.surface
          : 'transparent';

  useEffect(() => {
    if (!showAiPulse) {
      borderPulse.value = 0;
      return;
    }

    borderPulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [showAiPulse, borderPulse]);

  const aiPulseStyle = useAnimatedStyle(() => {
    if (!showAiPulse) {
      return {};
    }

    const borderFrom = withAlphaHex(processingAccent, 0.28);
    const borderTo = withAlphaHex(processingAccent, 0.62);
    const bgFrom = withAlphaHex(processingAccent, 0.1);
    const bgTo = withAlphaHex(processingAccent, 0.2);

    return {
      borderColor: interpolateColor(borderPulse.value, [0, 1], [borderFrom, borderTo]),
      backgroundColor: interpolateColor(borderPulse.value, [0, 1], [bgFrom, bgTo]),
    };
  }, [showAiPulse, processingAccent]);

  const containerStyle: ViewStyle = {
    height: itemHeight,
    minHeight: itemHeight,
    maxHeight: itemHeight,
    borderRadius:
      appearance === 'folder' ? TABLET_SIDEBAR_NAV_ITEM_RADIUS - 2 : TABLET_SIDEBAR_NAV_ITEM_RADIUS,
    paddingVertical: 0,
    borderWidth: isGhost ? 0 : 1,
    borderColor,
    backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <Animated.View style={aiPulseStyle}>
      <Button
        variant={appearance === 'ghost' ? 'ghost' : 'secondary'}
        size="md"
        fullWidth
        contentAlign="start"
        color={color}
        label={label}
        labelStyle={getTabletSidebarLabelStyle(isActive, labelColor)}
        icon={icon}
        trailingIcon={
          showProcessingIndicator || showUnreadDot || badgeCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {showProcessingIndicator ? (
                <TabletSidebarNavProcessingIndicator
                  color={color}
                  isActive={isActive}
                  kind={processingKind}
                />
              ) : null}
              {showUnreadDot ? <TabletSidebarNavUnreadDot color={color} /> : null}
              {badgeCount > 0 ? (
                <TabletSidebarNavBadge
                  count={badgeCount}
                  color={color}
                  accentHex={accentHex}
                  isActive={isActive}
                  onFilledSurface={appearance === 'primary'}
                />
              ) : null}
            </View>
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
    </Animated.View>
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
