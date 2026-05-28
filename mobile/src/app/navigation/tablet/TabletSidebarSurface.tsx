import React from 'react';
import { View } from 'react-native';

import {
  getTabletSidebarInnerWidth,
  TABLET_SIDEBAR_SURFACE_PAD,
  TABLET_SIDEBAR_SURFACE_RADIUS,
} from './tabletSidebarMetrics';
import type { TabletSidebarTheme } from './tabletSidebarTheme';

type TabletSidebarSurfaceProps = {
  theme: TabletSidebarTheme;
  contentWidth: number;
  children: React.ReactNode;
};

export function TabletSidebarSurface({ theme, contentWidth, children }: TabletSidebarSurfaceProps) {
  return (
    <View
      style={{
        width: contentWidth,
        borderRadius: TABLET_SIDEBAR_SURFACE_RADIUS,
        padding: TABLET_SIDEBAR_SURFACE_PAD,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {children}
    </View>
  );
}

export function useTabletSidebarInnerWidth(contentWidth: number): number {
  return getTabletSidebarInnerWidth(contentWidth);
}
