import {
  type BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportAudioProgressOverlay, useImportAudioFile } from '@/features/import-audio-file';
import { useInboxFiltersReset } from '@/features/inbox-filters';
import { useColors } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';

import {
  FLOAT_TAB_BAR_HEIGHT_PHONE,
  FLOAT_TAB_BAR_HEIGHT_TABLET,
  FLOAT_TAB_BOTTOM_GAP,
  FLOAT_TAB_HORIZONTAL_INSET,
  FLOAT_TAB_INNER_PAD_VERTICAL,
  FLOAT_TAB_MAX_WIDTH_TABLET,
  TAB_ICON_SIZE,
  TAB_ICONS,
  TAB_LABELS,
} from './config';
import { InboxNavigator } from './InboxNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import type { BottomTabParamList } from './types';
import { AnimatedTabButton, CenterRecordButton, EmptyScreen, EvenlySpacedBottomTabBar } from './ui';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const inboxFiltersReset = useInboxFiltersReset();
  const { importAudioFile, isImporting, importPhase } = useImportAudioFile();

  const color = useColors();
  const tabBg = color.background.primary;
  const tabActive = color.accent.primary;
  const tabInactive = color.tab.inactive;

  const tabBarHeight = isTablet ? FLOAT_TAB_BAR_HEIGHT_TABLET : FLOAT_TAB_BAR_HEIGHT_PHONE;

  const usableW = windowWidth - insets.left - insets.right;
  let tabletTabBarWidth: number | undefined;
  let tabletTabBarLeft: number | undefined;
  if (isTablet) {
    tabletTabBarWidth = Math.min(FLOAT_TAB_MAX_WIDTH_TABLET, usableW);
    tabletTabBarLeft = insets.left + (usableW - tabletTabBarWidth) / 2;
  }

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: tabActive,
    tabBarInactiveTintColor: tabInactive,
    tabBarStyle: {
      position: 'absolute' as const,
      ...(isTablet
        ? {
            left: tabletTabBarLeft,
            width: tabletTabBarWidth,
            marginHorizontal: 0,
          }
        : {
            left: 0,
            right: 0,
            marginHorizontal: FLOAT_TAB_HORIZONTAL_INSET,
          }),
      bottom: FLOAT_TAB_BOTTOM_GAP + insets.bottom,
      height: tabBarHeight,
      paddingTop: FLOAT_TAB_INNER_PAD_VERTICAL,
      paddingBottom: FLOAT_TAB_INNER_PAD_VERTICAL,
      backgroundColor: tabBg,
      borderTopWidth: 0,
      borderWidth: 0,
      borderRadius: tabBarHeight / 2,
      ...Platform.select({
        ios: {
          shadowColor: color.shadow.color,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: Math.min(0.22, color.shadow.opacity + 0.12),
          shadowRadius: 20,
        },
        android: {
          elevation: 14,
        },
        default: {},
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
      paddingHorizontal: 0,
    },
    tabBarButton: (props: BottomTabBarButtonProps) => <AnimatedTabButton {...props} />,
    lazy: true,
  };

  const bottomTouchShieldHeight = FLOAT_TAB_BOTTOM_GAP + insets.bottom;

  return (
    <View className="flex-1">
      <ImportAudioProgressOverlay visible={isImporting} phase={importPhase} />
      <Tab.Navigator
        screenOptions={screenOptions}
        tabBar={(props) => <EvenlySpacedBottomTabBar {...props} />}
      >
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
              <View style={{ alignItems: 'center', marginTop: isTablet ? 4 : 2 }}>
                <Text style={{ color: c, fontSize: isTablet ? 14 : 12, fontWeight: '500' }}>
                  {TAB_LABELS.Inbox}
                </Text>
              </View>
            ),
            tabBarIcon: ({ color: c }) => (
              <TAB_ICONS.Inbox size={isTablet ? 28 : TAB_ICON_SIZE} color={c} strokeWidth={1.8} />
            ),
            tabBarAccessibilityLabel: TAB_LABELS.Inbox,
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
              <View style={{ alignItems: 'center', marginTop: isTablet ? 4 : 2 }}>
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
      <View
        pointerEvents="box-only"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: bottomTouchShieldHeight,
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
};
