import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  useAndroidLayoutAnimation,
  useAppBootstrap,
  useAppForegroundLifecycle,
  usePushNotificationOpenedApp,
  useYandexMobileAdsInit,
} from '@/features/app-lifecycle';
import { AppLockGate } from '@/features/app-lock/ui/AppLockGate';
import { OnboardingGate } from '@/features/onboarding';
import { getColors, useAppTheme } from '@/shared/config';
import { NetworkStatusProvider } from '@/shared/lib';
import {
  type PushNotificationData,
  PushNotificationSheet,
  usePushNotifications,
} from '@/shared/lib/push';

import { useInitDeepLinking } from './deep-linking';
import { handlePushNotification } from './model/pushNavigationHandler';
import { navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';

const App = () => {
  const theme = useAppTheme();
  const color = getColors(theme);
  const isDark = theme === 'dark';

  const onPushData = useCallback((data: PushNotificationData) => {
    handlePushNotification(data);
  }, []);

  useInitDeepLinking();
  usePushNotifications({ onNotification: onPushData });
  usePushNotificationOpenedApp(onPushData);
  useAndroidLayoutAnimation();
  useYandexMobileAdsInit();
  useAppBootstrap(onPushData);
  useAppForegroundLifecycle();

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  return (
    <GestureHandlerRootView style={rootStyle}>
      <KeyboardProvider>
        <SafeAreaProvider style={safeAreaStyle}>
          <NetworkStatusProvider>
            <BottomSheetModalProvider>
              <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={color.background.primary}
              />
              <NavigationContainer ref={navigationRef}>
                <OnboardingGate>
                  <AppLockGate>
                    <RootNavigator />
                  </AppLockGate>
                </OnboardingGate>
              </NavigationContainer>
              <PushNotificationSheet />
            </BottomSheetModalProvider>
          </NetworkStatusProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

export default App;
