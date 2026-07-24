import React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { selectPlatform } from '@/shared/lib';
import { FrostedChromeBackground } from '@/shared/ui';

import {
  getTabletSidebarInnerWidth,
  TABLET_SIDEBAR_SURFACE_PAD,
  TABLET_SIDEBAR_SURFACE_RADIUS,
} from './tabletSidebarMetrics';
import type { TabletSidebarTheme } from './tabletSidebarTheme';

type TabletSidebarSurfaceProps = {
  color: Colors;
  theme: TabletSidebarTheme;
  contentWidth: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function TabletSidebarSurface({
  color,
  theme,
  contentWidth,
  children,
  style,
}: TabletSidebarSurfaceProps) {
  return (
    <View
      style={[
        {
          width: contentWidth,
          borderRadius: TABLET_SIDEBAR_SURFACE_RADIUS,
          backgroundColor: 'transparent',
          ...selectPlatform({
            ios: {
              shadowColor: color.shadow.color,
              shadowOffset: { width: 0, height: FLOAT_TAB_IOS_SHADOW_OFFSET_Y },
              shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
              shadowRadius: FLOAT_TAB_IOS_SHADOW_RADIUS,
            },
            android: {
              elevation: 8,
            },
            default: {},
          }),
        },
        style,
      ]}
    >
      <View
        style={{
          borderRadius: TABLET_SIDEBAR_SURFACE_RADIUS,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <FrostedChromeBackground borderRadius={TABLET_SIDEBAR_SURFACE_RADIUS} />
        <View style={{ padding: TABLET_SIDEBAR_SURFACE_PAD }}>{children}</View>
      </View>
    </View>
  );
}

export function useTabletSidebarInnerWidth(contentWidth: number): number {
  return getTabletSidebarInnerWidth(contentWidth);
}
