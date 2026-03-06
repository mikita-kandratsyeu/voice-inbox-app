import '../../global.css';

import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getColors } from '@/shared/config';

import { RootNavigator } from './navigation/RootNavigator';

const App = () => {
  const isDark = useColorScheme() === 'dark';
  const color = getColors(isDark ? 'dark' : 'light');

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  useEffect(() => {
    import('@/shared/lib').then(({ initDB }) => {
      initDB();
      import('@/entities/record').then(({ useRecordStore }) => {
        useRecordStore.getState().load();
      });
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
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
