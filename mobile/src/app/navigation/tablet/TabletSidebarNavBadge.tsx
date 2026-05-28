import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import { formatTabletSidebarBadgeCount } from './useTabletSidebarNavCounts';

type TabletSidebarNavBadgeProps = {
  count: number;
  color: Colors;
  accentHex?: string;
  isActive: boolean;
  /** Primary sidebar rows use a filled surface; badge needs a contrasting chip. */
  onFilledSurface?: boolean;
};

export function TabletSidebarNavBadge({
  count,
  color,
  accentHex,
  isActive,
  onFilledSurface = false,
}: TabletSidebarNavBadgeProps) {
  if (count <= 0) return null;

  const accent = accentHex ?? color.accent.primary;

  const backgroundColor = isActive
    ? withAlphaHex(accent, 0.22)
    : onFilledSurface
      ? color.background.card
      : color.background.tertiary;

  return (
    <View
      style={{
        minWidth: 22,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        borderWidth: onFilledSurface && !isActive ? 1 : 0,
        borderColor: color.border.default,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          fontVariant: ['tabular-nums'],
          color: isActive ? accent : color.text.secondary,
        }}
      >
        {formatTabletSidebarBadgeCount(count)}
      </Text>
    </View>
  );
}
