import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AnimatedBootSplash,
  type BootstrapCriticalError,
  useAndroidLayoutAnimation,
  useAppBootstrap,
  useAppForegroundLifecycle,
  usePushNotificationOpenedApp,
  useYandexMobileAdsInit,
} from '@/features/app-lifecycle';
import { AppLockGate, AppSwitcherPrivacyOverlay } from '@/features/app-lock';
import { AppRatingPromptRoot } from '@/features/app-review';
import { OnboardingGate } from '@/features/onboarding';
import { useResetAccentWhenNotPro } from '@/features/pro-license';
import { TranscriptionKeepAwake, TranscriptionResumePrompt } from '@/features/transcription';
import {
  BootSplashVisibleProvider,
  useAppTheme,
  useBootSplashVisible,
  useColors,
} from '@/shared/config';
import { i18n, NetworkStatusProvider } from '@/shared/lib';
import { logAnalyticsScreenView } from '@/shared/lib/analytics';
import {
  type PushNotificationData,
  PushNotificationSheet,
  usePushNotifications,
} from '@/shared/lib/push';
import { WarmupBottomSheet } from '@/shared/ui';

import { flushPendingRecordModalNavigation, useInitDeepLinking } from './deep-linking';
import { handlePushNotification } from './model/pushNavigationHandler';
import { navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';

const App = () => {
  const [bootSplashVisible, setBootSplashVisible] = useState(true);

  return (
    <BootSplashVisibleProvider value={bootSplashVisible}>
      <AppShell setBootSplashVisible={setBootSplashVisible} />
    </BootSplashVisibleProvider>
  );
};

type AppShellProps = {
  setBootSplashVisible: (visible: boolean) => void;
};

const AppShell = ({ setBootSplashVisible }: AppShellProps) => {
  const theme = useAppTheme();
  const color = useColors();
  const bootSplashVisible = useBootSplashVisible();

  const isDark = theme === 'dark';

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
  }, [setBootSplashVisible]);

  const onCriticalError = useCallback((_kind: BootstrapCriticalError) => {
    Alert.alert(i18n.t('bootstrap.dbErrorTitle'), i18n.t('bootstrap.dbErrorMessage'), [
      { text: i18n.t('bootstrap.dbErrorRestart') },
    ]);
  }, []);

  useInitDeepLinking();
  usePushNotifications({ onNotification: onPushData });
  usePushNotificationOpenedApp(onPushData);
  useAndroidLayoutAnimation();
  useYandexMobileAdsInit();
  useAppBootstrap(onPushData, { onBootstrapReady, onCriticalError });
  useAppForegroundLifecycle();
  useResetAccentWhenNotPro({ enabled: !bootSplashVisible });

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
                  flushPendingRecordModalNavigation();
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
                    <TranscriptionResumePrompt />
                    <RootNavigator />
                  </AppLockGate>
                </OnboardingGate>
              </NavigationContainer>
              <WarmupBottomSheet />
              <PushNotificationSheet />
              <AppRatingPromptRoot />
            </BottomSheetModalProvider>
            <AppSwitcherPrivacyOverlay />
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
