import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import messaging from '@react-native-firebase/messaging';
import { NavigationContainer } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus, StatusBar } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useRecordStore } from '@/entities/record';
import { AppLockGate } from '@/features/app-lock/ui/AppLockGate';
import { OnboardingGate } from '@/features/onboarding';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { createHandlePushNotification } from '@/features/push-handling';
import { releaseWhisperContext } from '@/features/transcription';
import { getColors, useAppTheme } from '@/shared/config';
import { initDB, NetworkStatusProvider } from '@/shared/lib';
import {
  ensurePushRegistered,
  notifyAppBackground,
  notifyAppForeground,
  type PushNotificationData,
  PushNotificationSheet,
  usePushNotifications,
} from '@/shared/lib/push';

import { navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';

const handlePushNotification = createHandlePushNotification({
  navigateToMain: () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main');
    }
  },
});

const App = () => {
  const theme = useAppTheme();
  const color = getColors(theme);
  const isDark = theme === 'dark';

  const handleNotification = useCallback(handlePushNotification, []);

  usePushNotifications({ onNotification: handleNotification });

  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage.data) {
        handlePushNotification(remoteMessage.data as unknown as PushNotificationData);
      }
    });
    return unsubscribe;
  }, []);

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  useEffect(() => {
    initDB()
      .then(async () => {
        await useRecordStore.getState().load();
        BootSplash.hide({ fade: true });

        const initial = await messaging().getInitialNotification();
        if (initial?.data) {
          handlePushNotification(initial.data as unknown as PushNotificationData);
        }

        if (getHasSeenOnboarding()) {
          ensurePushRegistered().catch(() => {});
        }
      })
      .catch(() => {
        BootSplash.hide({ fade: true });
      });
  }, []);

  useEffect(() => {
    let foregroundInterval: ReturnType<typeof setInterval> | null = null;
    let unsubscribeStore: (() => void) | null = null;
    let lastHeartbeatAt = 0;
    let lastForegroundAt = 0;

    const HEARTBEAT_INTERVAL_MS = 40_000;
    const HEARTBEAT_THROTTLE_MS = 35_000;
    const FOREGROUND_ON_ACTIVE_THROTTLE_MS = 15_000;

    const sendForegroundHeartbeat = () => {
      if (!getHasSeenOnboarding()) return;
      lastHeartbeatAt = Date.now();
      notifyAppForeground();
    };

    const maybeNotifyForeground = () => {
      const records = useRecordStore.getState().records;
      const isAiProcessing = records.some((r) => r.aiStatus === 'processing');
      if (!isAiProcessing) return;

      const now = Date.now();
      if (now - lastHeartbeatAt >= HEARTBEAT_THROTTLE_MS) {
        sendForegroundHeartbeat();
      }
    };

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        if (getHasSeenOnboarding()) {
          ensurePushRegistered().catch(() => {});
        }
        const now = Date.now();
        const shouldSendForeground =
          now - lastForegroundAt >= FOREGROUND_ON_ACTIVE_THROTTLE_MS || lastForegroundAt === 0;
        if (shouldSendForeground) {
          lastHeartbeatAt = 0;
          sendForegroundHeartbeat();
          lastForegroundAt = now;
        }
        foregroundInterval = setInterval(maybeNotifyForeground, HEARTBEAT_INTERVAL_MS);
        unsubscribeStore = useRecordStore.subscribe(() => {
          if (AppState.currentState === 'active') {
            maybeNotifyForeground();
          }
        });
      } else {
        if (foregroundInterval) {
          clearInterval(foregroundInterval);
          foregroundInterval = null;
        }
        unsubscribeStore?.();
        unsubscribeStore = null;
        if (state === 'background' || state === 'inactive') {
          if (getHasSeenOnboarding()) {
            notifyAppBackground();
          }
          lastForegroundAt = 0;
        }
        if (state === 'background') {
          const records = useRecordStore.getState().records;
          const isTranscribing = records.some((r) => r.aiStatus === 'processing');
          if (!isTranscribing) {
            releaseWhisperContext().catch(() => {});
          }
        }
      }
    };

    handleAppStateChange(AppState.currentState);
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      if (foregroundInterval) clearInterval(foregroundInterval);
      unsubscribeStore?.();
      releaseWhisperContext().catch(() => {});
    };
  }, []);

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
