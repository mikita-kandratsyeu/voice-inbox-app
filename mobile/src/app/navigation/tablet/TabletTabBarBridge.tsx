import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useLayoutEffect } from 'react';

import type { BottomTabParamList } from '../types';
import { useTabletTabNavigationStore } from './tabletTabNavigation';

/** Hidden tab bar on tablet; keeps sidebar in sync with the active tab. */
export function TabletTabBarBridge({ state }: BottomTabBarProps) {
  const setActiveTab = useTabletTabNavigationStore((s) => s.setActiveTab);

  useLayoutEffect(() => {
    const route = state.routes[state.index];
    if (route?.name) {
      setActiveTab(route.name as keyof BottomTabParamList);
    }
  }, [state, setActiveTab]);

  return null;
}
