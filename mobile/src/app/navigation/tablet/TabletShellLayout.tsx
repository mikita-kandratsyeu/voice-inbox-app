import React from 'react';
import { View } from 'react-native';

import { useColors } from '@/shared/config';

import { TabletSidebar } from './TabletSidebar';
import { getTabletSidebarTheme } from './tabletSidebarTheme';

type TabletShellLayoutProps = {
  children: React.ReactNode;
};

export const TabletShellLayout = ({ children }: TabletShellLayoutProps) => {
  const color = useColors();
  const theme = getTabletSidebarTheme(color);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.panel }}>
      <TabletSidebar />
      <View
        style={{
          flex: 1,
          minWidth: 0,
          backgroundColor: theme.content,
        }}
      >
        {children}
      </View>
    </View>
  );
};
