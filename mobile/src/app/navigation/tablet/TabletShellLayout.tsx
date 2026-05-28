import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useColors } from '@/shared/config';

import { TabletSidebar } from './TabletSidebar';
import { useTabletSidebarCollapsedStore } from './tabletSidebarCollapsedStore';
import { TabletSidebarLayoutProvider, useTabletSidebarLayout } from './TabletSidebarLayoutContext';
import { getTabletSidebarTheme } from './tabletSidebarTheme';

type TabletShellLayoutProps = {
  children: React.ReactNode;
};

function TabletShellLayoutBody({ children }: TabletShellLayoutProps) {
  const color = useColors();
  const theme = getTabletSidebarTheme(color);
  const { contentInnerStyle } = useTabletSidebarLayout();

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        overflow: 'hidden',
        backgroundColor: theme.panel,
      }}
    >
      <TabletSidebar />
      <View
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          backgroundColor: theme.content,
        }}
      >
        <Animated.View style={[{ flex: 1 }, contentInnerStyle]}>{children}</Animated.View>
      </View>
    </View>
  );
}

export const TabletShellLayout = ({ children }: TabletShellLayoutProps) => {
  const isCollapsed = useTabletSidebarCollapsedStore((s) => s.isCollapsed);

  return (
    <TabletSidebarLayoutProvider isCollapsed={isCollapsed}>
      <TabletShellLayoutBody>{children}</TabletShellLayoutBody>
    </TabletSidebarLayoutProvider>
  );
};
