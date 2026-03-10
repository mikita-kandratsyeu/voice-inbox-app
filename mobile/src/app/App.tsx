import '../../global.css';

import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RNSplashScreen from 'react-native-splash-screen';

import { AppLockGate } from '@/features/app-lock/ui/AppLockGate';
import { OnboardingGate } from '@/features/onboarding';
import { getColors } from '@/shared/config';

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
          RNSplashScreen.hide();
        }),
      );
    });
  }, []);

  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider style={safeAreaStyle}>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
