import React from 'react';
import { View } from 'react-native';

import { useColors } from '@/shared/config';

import { TabletShellProvider } from './TabletShellContext';
import { TabletSidebar } from './TabletSidebar';
import { getTabletSidebarTheme } from './tabletSidebarTheme';

type TabletShellLayoutProps = {
  children: React.ReactNode;
};

export const TabletShellLayout = ({ children }: TabletShellLayoutProps) => {
  const color = useColors();
  const theme = getTabletSidebarTheme(color);

  return (
    <TabletShellProvider value={true}>
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
    </TabletShellProvider>
  );
};
