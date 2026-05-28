import React, { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';

import { useTabletSidebarLayoutAnimation } from './useTabletSidebarLayoutAnimation';

export type TabletSidebarLayoutContextValue = {
  progress: SharedValue<number>;
  sidebarShellStyle: AnimatedStyle<{ width: number }>;
  expandedLayerStyle: AnimatedStyle<{ opacity: number }>;
  collapsedLayerStyle: AnimatedStyle<{ opacity: number }>;
  contentInnerStyle: AnimatedStyle<{ width: number }>;
};

const TabletSidebarLayoutContext = createContext<TabletSidebarLayoutContextValue | null>(null);

type TabletSidebarLayoutProviderProps = {
  isCollapsed: boolean;
  children: React.ReactNode;
};

export function TabletSidebarLayoutProvider({
  isCollapsed,
  children,
}: TabletSidebarLayoutProviderProps) {
  const value = useTabletSidebarLayoutAnimation(isCollapsed);

  return (
    <TabletSidebarLayoutContext.Provider value={value}>
      {children}
    </TabletSidebarLayoutContext.Provider>
  );
}

export function useTabletSidebarLayout(): TabletSidebarLayoutContextValue {
  const ctx = useContext(TabletSidebarLayoutContext);
  if (!ctx) {
    throw new Error('useTabletSidebarLayout must be used within TabletSidebarLayoutProvider');
  }
  return ctx;
}
