import { CommonActions } from '@react-navigation/native';
import { create } from 'zustand';

import { navigationRef } from '../navigationRef';
import type { BottomTabParamList, SettingsStackParamList } from '../types';

type TabletTabNavigationState = {
  activeTab: keyof BottomTabParamList;
  setActiveTab: (tab: keyof BottomTabParamList) => void;
};

export const useTabletTabNavigationStore = create<TabletTabNavigationState>((set) => ({
  activeTab: 'Inbox',
  setActiveTab: (activeTab) => set({ activeTab }),
}));

/**
 * Opens a settings stack screen with Settings underneath so `goBack()` works
 * (sidebar deep links must not use a single-route stack).
 */
export function navigateSettingsStackScreen<T extends keyof SettingsStackParamList>(
  screen: T,
  params?: SettingsStackParamList[T],
): void {
  if (!navigationRef.isReady()) {
    return;
  }

  const childRoute = params === undefined ? { name: screen } : { name: screen, params };

  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'Main',
      params: {
        screen: 'SettingsRoot',
        params: {
          state: {
            routes: [{ name: 'Settings' }, childRoute],
            index: 1,
          },
        },
      },
    }),
  );

  useTabletTabNavigationStore.getState().setActiveTab('SettingsRoot');
}

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
