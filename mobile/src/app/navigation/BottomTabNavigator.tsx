import {
  type BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportAudioProgressOverlay, useImportAudioFile } from '@/features/import-audio-file';
import { useInboxFiltersReset } from '@/features/inbox-filters';
import { useColors } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';

import { TAB_ICON_SIZE, TAB_ICONS, TAB_LABELS } from './config';
import { InboxNavigator } from './InboxNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import type { BottomTabParamList } from './types';
import { AnimatedTabButton, CenterRecordButton, EmptyScreen } from './ui';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const inboxFiltersReset = useInboxFiltersReset();
  const { importAudioFile, isImporting, importPhase } = useImportAudioFile();

  const color = useColors();
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
      ...(isTablet
        ? {
            height: 72 + insets.bottom,
            paddingTop: 0,
            paddingBottom: insets.bottom,
          }
        : {
            height: 60 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          }),
    },
    tabBarLabelStyle: {
      fontSize: isTablet ? 14 : 12,
      fontWeight: '500' as const,
      marginTop: isTablet ? 4 : 2,
      textAlign: 'center' as const,
    },
    tabBarIconStyle: {
      marginBottom: 0,
    },
    tabBarItemStyle: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: isTablet ? 48 : 16,
      ...(isTablet
        ? { height: 72, paddingTop: 0, paddingBottom: 0, marginBottom: insets.bottom }
        : {}),
    },
    tabBarButton: (props: BottomTabBarButtonProps) => <AnimatedTabButton {...props} />,
    lazy: true,
  };

  return (
    <View className="flex-1">
      <ImportAudioProgressOverlay visible={isImporting} phase={importPhase} />
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="Inbox"
          component={InboxNavigator}
          listeners={
            inboxFiltersReset
              ? {
                  tabPress: () => inboxFiltersReset.triggerReset(),
                }
              : undefined
          }
          options={{
            tabBarLabel: ({ color: c }) => (
              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  marginTop: isTablet ? 4 : 2,
                }}
              >
                <Text style={{ color: c, fontSize: isTablet ? 14 : 12, fontWeight: '500' }}>
                  {TAB_LABELS.Inbox}
                </Text>
              </View>
            ),
            tabBarIcon: ({ color: c }) => (
              <TAB_ICONS.Inbox size={isTablet ? 28 : TAB_ICON_SIZE} color={c} strokeWidth={1.8} />
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
                isTablet={isTablet}
                onLongPress={importAudioFile}
              />
            ),
          }}
        />
        <Tab.Screen
          name="SettingsRoot"
          component={SettingsNavigator}
          options={{
            tabBarLabel: ({ color: c }) => (
              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  marginTop: isTablet ? 4 : 2,
                }}
              >
                <Text style={{ color: c, fontSize: isTablet ? 14 : 12, fontWeight: '500' }}>
                  {TAB_LABELS.Settings}
                </Text>
              </View>
            ),
            tabBarIcon: ({ color: c }) => (
              <TAB_ICONS.Settings
                size={isTablet ? 28 : TAB_ICON_SIZE}
                color={c}
                strokeWidth={1.8}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};
