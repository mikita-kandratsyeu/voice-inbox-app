import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
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

import { RootNavigator } from './navigation/RootNavigator';

const App = () => {
  const theme = useAppTheme();
  const color = getColors(theme);
  const isDark = theme === 'dark';

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  useEffect(() => {
    initDB()
      .then(() => {
        useRecordStore.getState().load();
        BootSplash.hide({ fade: true });
      })
      .catch(() => {
        BootSplash.hide({ fade: true });
      });
  }, []);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state !== 'background') return;

      const records = useRecordStore.getState().records;
      const isTranscribing = records.some((r) => r.aiStatus === 'processing');
      if (!isTranscribing) {
        releaseWhisperContext().catch(() => {});
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
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
              <NavigationContainer>
                <OnboardingGate>
                  <AppLockGate>
                    <RootNavigator />
                  </AppLockGate>
                </OnboardingGate>
              </NavigationContainer>
            </BottomSheetModalProvider>
          </NetworkStatusProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

export default App;
