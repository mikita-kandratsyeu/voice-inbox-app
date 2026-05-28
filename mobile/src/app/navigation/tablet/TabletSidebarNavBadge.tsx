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
};

export function TabletSidebarNavBadge({
  count,
  color,
  accentHex,
  isActive,
}: TabletSidebarNavBadgeProps) {
  if (count <= 0) return null;

  const accent = accentHex ?? color.accent.primary;

  return (
    <View
      style={{
        minWidth: 22,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? withAlphaHex(accent, 0.22) : color.background.tertiary,
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
