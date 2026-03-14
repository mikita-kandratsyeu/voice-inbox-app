import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
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
import { releaseWhisperContext } from '@/features/transcription';
import { getColors, useAppTheme } from '@/shared/config';
import { initDB, NetworkStatusProvider } from '@/shared/lib';
import {
  notifyAppBackground,
  notifyAppForeground,
  PolicyUpdateSheet,
  type PushNotificationData,
  usePushNotifications,
  usePushSheet,
} from '@/shared/lib/push';

import { navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';

function handlePushNotification(data: PushNotificationData): void {
  if (!data?.type) return;

  if (data.type === 'ai_complete') {
    // Navigate to Inbox so user sees all completed notes
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main');
    }
    return;
  }

  if (data.type === 'policy_update') {
    const message = typeof data.message === 'string' ? data.message : '';
    usePushSheet.getState().show(message);
    return;
  }
}

const App = () => {
  const theme = useAppTheme();
  const color = getColors(theme);
  const isDark = theme === 'dark';

  const handleNotification = useCallback(handlePushNotification, []);

  const { setupAndRegister } = usePushNotifications({ onNotification: handleNotification });

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  useEffect(() => {
    initDB()
      .then(async () => {
        await useRecordStore.getState().load();
        BootSplash.hide({ fade: true });
        setupAndRegister();

        const initial = await PushNotificationIOS.getInitialNotification();
        if (initial) {
          const data = initial.getData() as PushNotificationData | undefined;
          if (data) handlePushNotification(data);
        }
      })
      .catch(() => {
        BootSplash.hide({ fade: true });
      });
  }, [setupAndRegister]);

  useEffect(() => {
    let foregroundInterval: ReturnType<typeof setInterval> | null = null;
    let unsubscribeStore: (() => void) | null = null;
    let lastHeartbeatAt = 0;
    // Heartbeat every 40s, TTL on server is 60s — plenty of margin
    const HEARTBEAT_INTERVAL_MS = 40_000;
    const HEARTBEAT_THROTTLE_MS = 35_000;

    const sendForegroundHeartbeat = () => {
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
        // Always send heartbeat on becoming active — regardless of AI status.
        // This covers the case where the user is in the app while AI is processing
        // but the foreground key expired (e.g. app was backgrounded briefly).
        lastHeartbeatAt = 0;
        sendForegroundHeartbeat();
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
          notifyAppBackground();
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
              <PolicyUpdateSheet />
            </BottomSheetModalProvider>
          </NetworkStatusProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

export default App;
