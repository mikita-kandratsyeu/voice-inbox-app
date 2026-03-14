import {
  type BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInboxFiltersReset } from '@/features/inbox-filters';
import { InboxScreen } from '@/screens/inbox';
import { getColors, useAppTheme } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';

import { TAB_ICON_SIZE, TAB_ICONS, TAB_LABELS } from './config';
import { SettingsNavigator } from './SettingsNavigator';
import type { BottomTabParamList } from './types';
import { AnimatedTabButton, CenterRecordButton, EmptyScreen } from './ui';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const isTablet = useIsTablet();
  const tabBarHeight = (isTablet ? 68 : 60) + insets.bottom;
  const inboxFiltersReset = useInboxFiltersReset();

  const color = getColors(theme);
  const tabBg = color.background.primary;
  const tabBorder = color.border.default;
  const tabActive = color.accent.primary;
  const tabInactive = color.tab.inactive;

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: tabActive,
    tabBarInactiveTintColor: tabInactive,
    tabBarStyle: {
      backgroundColor: tabBg,
      borderTopColor: tabBorder,
      borderTopWidth: 1,
      height: tabBarHeight,
      paddingTop: 8,
      paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
    },
    tabBarLabelStyle: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginBottom: 0,
    },
    tabBarItemStyle: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: isTablet ? 32 : 16,
    },
    tabBarButton: (props: BottomTabBarButtonProps) => <AnimatedTabButton {...props} />,
    lazy: true,
  };

  return (
    <View className="flex-1">
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          listeners={
            inboxFiltersReset
              ? {
                  tabPress: () => inboxFiltersReset.triggerReset(),
                }
              : undefined
          }
          options={{
            tabBarLabel: TAB_LABELS.Inbox,
            tabBarIcon: ({ color: c }) => (
              <TAB_ICONS.Inbox size={TAB_ICON_SIZE} color={c} strokeWidth={1.8} />
            ),
          }}
        />
        <Tab.Screen
          name="Record"
          component={EmptyScreen}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('RecordModal' as never);
            },
          })}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: () => (
              <CenterRecordButton
                iconColor={color.icon.onAccent}
                accentColor={color.accent.primary}
              />
            ),
          }}
        />
        <Tab.Screen
          name="SettingsRoot"
          component={SettingsNavigator}
          options={{
            tabBarLabel: TAB_LABELS.Settings,
            tabBarIcon: ({ color: c }) => (
              <TAB_ICONS.Settings size={TAB_ICON_SIZE} color={c} strokeWidth={1.8} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};
