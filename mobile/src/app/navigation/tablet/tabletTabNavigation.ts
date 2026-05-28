import { create } from 'zustand';

import { navigationRef } from '../navigationRef';
import type { BottomTabParamList } from '../types';

type TabletTabNavigationState = {
  activeTab: keyof BottomTabParamList;
  setActiveTab: (tab: keyof BottomTabParamList) => void;
};

export const useTabletTabNavigationStore = create<TabletTabNavigationState>((set) => ({
  activeTab: 'Inbox',
  setActiveTab: (activeTab) => set({ activeTab }),
}));

/** Switch bottom tabs from outside `Tab.Navigator` (e.g. tablet sidebar). */
export function navigateMainTab(
  screen: keyof BottomTabParamList,
  params?: BottomTabParamList[typeof screen],
): void {
  if (!navigationRef.isReady()) {
    return;
  }
  if (screen === 'Record') {
    navigationRef.navigate('RecordModal');
    return;
  }
  navigationRef.navigate('Main', {
    screen,
    params: params as never,
  });
}
