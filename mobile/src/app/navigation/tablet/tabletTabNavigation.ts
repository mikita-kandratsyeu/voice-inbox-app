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
function getFocusedSettingsStackScreen(): keyof SettingsStackParamList | null {
  if (!navigationRef.isReady()) {
    return null;
  }

  const root = navigationRef.getRootState();
  const mainRoute = root.routes[root.index ?? 0];
  if (mainRoute?.name !== 'Main' || !mainRoute.state) {
    return null;
  }

  const tabState = mainRoute.state;
  const tabRoute = tabState.routes[tabState.index ?? 0];
  if (tabRoute?.name !== 'SettingsRoot') {
    return null;
  }

  const settingsState = tabRoute.state;
  if (!settingsState || settingsState.routes.length === 0) {
    return 'Settings';
  }

  const settingsRoute = settingsState.routes[settingsState.index ?? 0];
  return (settingsRoute?.name as keyof SettingsStackParamList | undefined) ?? null;
}

/** True when the settings tab is focused on a specific stack screen. */
export function isOnSettingsStackScreen(screen: keyof SettingsStackParamList): boolean {
  return getFocusedSettingsStackScreen() === screen;
}

export function navigateSettingsStackScreen<T extends keyof SettingsStackParamList>(
  screen: T,
  params?: SettingsStackParamList[T],
): void {
  if (!navigationRef.isReady()) {
    return;
  }

  if (isOnSettingsStackScreen(screen) && params === undefined) {
    return;
  }

  if (isOnSettingsStackScreen(screen) && params !== undefined) {
    navigationRef.navigate('Main', {
      screen: 'SettingsRoot',
      params: {
        screen,
        params,
        merge: true,
      },
    } as never);
    useTabletTabNavigationStore.getState().setActiveTab('SettingsRoot');
    return;
  }

  const childRoute = params === undefined ? { name: screen } : { name: screen, params };

  navigationRef.dispatch(
    CommonActions.navigate('Main', {
      screen: 'SettingsRoot',
      params: {
        state: {
          routes: [{ name: 'Settings' }, childRoute],
          index: 1,
        },
      },
    }),
  );

  useTabletTabNavigationStore.getState().setActiveTab('SettingsRoot');
}

/** True when the settings tab is focused on the root Settings screen (not a pushed sub-screen). */
export function isOnSettingsRootScreen(): boolean {
  return isOnSettingsStackScreen('Settings');
}

/** Open settings tab and reset its stack to the root Settings screen (tablet sidebar). */
export function navigateSettingsRoot(): void {
  if (!navigationRef.isReady()) {
    return;
  }

  if (isOnSettingsRootScreen()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.navigate('Main', {
      screen: 'SettingsRoot',
      params: {
        state: {
          routes: [{ name: 'Settings' }],
          index: 0,
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
