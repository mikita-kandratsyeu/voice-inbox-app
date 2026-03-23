import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AnimatedBootSplash,
  useAndroidLayoutAnimation,
  useAppBootstrap,
  useAppForegroundLifecycle,
  usePushNotificationOpenedApp,
  useYandexMobileAdsInit,
} from '@/features/app-lifecycle';
import { AppLockGate } from '@/features/app-lock/ui/AppLockGate';
import { AppRatingPromptRoot } from '@/features/app-review';
import { OnboardingGate } from '@/features/onboarding';
import { TranscriptionKeepAwake } from '@/features/transcription';
import { getColors, useAppTheme } from '@/shared/config';
import { NetworkStatusProvider } from '@/shared/lib';
import { logAnalyticsScreenView } from '@/shared/lib/analytics';
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

  const [bootSplashVisible, setBootSplashVisible] = useState(true);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const routeNameRef = useRef<string | undefined>(undefined);

  const onPushData = useCallback((data: PushNotificationData) => {
    handlePushNotification(data);
  }, []);

  const onBootstrapReady = useCallback(() => {
    setBootstrapReady(true);
  }, []);

  const onBootSplashAnimationEnd = useCallback(() => {
    setBootSplashVisible(false);
  }, []);

  useInitDeepLinking();
  usePushNotifications({ onNotification: onPushData });
  usePushNotificationOpenedApp(onPushData);
  useAndroidLayoutAnimation();
  useYandexMobileAdsInit();
  useAppBootstrap(onPushData, { onBootstrapReady });
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
              <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                  routeNameRef.current = navigationRef.getCurrentRoute()?.name;
                }}
                onStateChange={() => {
                  const previous = routeNameRef.current;
                  const current = navigationRef.getCurrentRoute()?.name;
                  if (current != null && current !== previous) {
                    routeNameRef.current = current;
                    void logAnalyticsScreenView(current);
                  }
                }}
              >
                <OnboardingGate>
                  <AppLockGate>
                    <TranscriptionKeepAwake />
                    <RootNavigator />
                  </AppLockGate>
                </OnboardingGate>
              </NavigationContainer>
              <PushNotificationSheet />
              <AppRatingPromptRoot />
            </BottomSheetModalProvider>
          </NetworkStatusProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
      {bootSplashVisible && (
        <AnimatedBootSplash ready={bootstrapReady} onAnimationEnd={onBootSplashAnimationEnd} />
      )}
    </GestureHandlerRootView>
  );
};

export default App;
