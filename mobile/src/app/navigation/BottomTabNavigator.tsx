import {
  type BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import React, { useCallback, useEffect } from 'react';
import { AppState, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportAudioProgressOverlay, useImportAudioFile } from '@/features/import-audio-file';
import { consumeAndroidPendingSharedAudioPath } from '@/features/import-audio-file/lib/androidSharedAudioImport';
import { registerSharedAudioImportHandler } from '@/features/import-audio-file/lib/sharedAudioImportRegistry';
import { useInboxFiltersReset } from '@/features/inbox-filters';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { useColors } from '@/shared/config';
import { IS_ANDROID, useIsTablet } from '@/shared/lib';

import {
  buildFloatingTabBarStyle,
  FLOAT_TAB_BOTTOM_GAP,
  floatingTabBarShadowOpacity,
  TAB_ICON_SIZE,
  TAB_ICONS,
  TAB_LABELS,
} from './config';
import { InboxNavigator } from './InboxNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import type { BottomTabParamList } from './types';
import {
  AnimatedTabButton,
  CenterRecordButton,
  EmptyScreen,
  EvenlySpacedBottomTabBar,
  FloatingTabBarBackground,
} from './ui';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const inboxFiltersReset = useInboxFiltersReset();
  const { importAudioFile, importAudioFromExternalUri, isImporting, importPhase } =
    useImportAudioFile();

  const openSharedUri = useCallback(
    async (uri: string) => {
      if (!getHasSeenOnboarding()) return;
      await importAudioFromExternalUri(uri, null);
    },
    [importAudioFromExternalUri],
  );

  useEffect(() => {
    registerSharedAudioImportHandler((uri) => {
      void openSharedUri(uri);
    });
    return () => registerSharedAudioImportHandler(null);
  }, [openSharedUri]);

  const tryConsumeAndroidPending = useCallback(async () => {
    if (!IS_ANDROID || !getHasSeenOnboarding() || isImporting) return;
    const path = await consumeAndroidPendingSharedAudioPath();
    if (!path) return;
    const uri = path.startsWith('content:') || path.startsWith('file:') ? path : `file://${path}`;
    await importAudioFromExternalUri(uri, null);
  }, [importAudioFromExternalUri, isImporting]);

  useEffect(() => {
    void tryConsumeAndroidPending();
  }, [tryConsumeAndroidPending]);

  useEffect(() => {
    if (!IS_ANDROID) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void tryConsumeAndroidPending();
      }
    });
    return () => sub.remove();
  }, [tryConsumeAndroidPending]);

  const color = useColors();
  const tabActive = color.accent.primary;
  const tabInactive = color.tab.inactive;

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: tabActive,
    tabBarInactiveTintColor: tabInactive,
    tabBarBackground: () => <FloatingTabBarBackground />,
    tabBarStyle: buildFloatingTabBarStyle({
      insets,
      windowWidth,
      isTablet,
      shadowColor: color.shadow.color,
      shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
    }),
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
