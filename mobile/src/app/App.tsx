import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { AppState, type AppStateStatus, StatusBar, useColorScheme } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useRecordStore } from '@/entities/record';
import { AppLockGate } from '@/features/app-lock/ui/AppLockGate';
import { OnboardingGate } from '@/features/onboarding';
import { releaseWhisperContext } from '@/features/transcription';
import { getColors } from '@/shared/config';
import { NetworkStatusProvider } from '@/shared/lib';

import { RootNavigator } from './navigation/RootNavigator';

const App = () => {
  const isDark = useColorScheme() === 'dark';
  const color = getColors(isDark ? 'dark' : 'light');

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  useEffect(() => {
    import('@/shared/lib').then(({ initDB }) => {
      initDB().then(() =>
        import('@/entities/record').then(({ useRecordStore }) => {
          useRecordStore.getState().load();
          BootSplash.hide({ fade: true });
        }),
      );
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
