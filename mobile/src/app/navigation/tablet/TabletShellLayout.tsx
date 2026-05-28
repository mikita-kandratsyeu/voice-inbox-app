import React from 'react';
import { View } from 'react-native';

import { useColors } from '@/shared/config';

import { TabletSidebar } from './TabletSidebar';
import { useTabletSidebarCollapsedStore } from './tabletSidebarCollapsedStore';
import { TabletSidebarLayoutProvider } from './TabletSidebarLayoutContext';
import { getTabletSidebarTheme } from './tabletSidebarTheme';

type TabletShellLayoutProps = {
  children: React.ReactNode;
};

function TabletShellLayoutBody({ children }: TabletShellLayoutProps) {
  const color = useColors();
  const theme = getTabletSidebarTheme(color);

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
        <View style={{ flex: 1, width: '100%', backgroundColor: theme.content }}>{children}</View>
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
