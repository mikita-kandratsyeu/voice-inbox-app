import '../../global.css';

import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getColors } from '@/shared/config';

import { BottomTabNavigator } from './navigation/BottomTabNavigator';

const App = () => {
  const isDark = useColorScheme() === 'dark';
  const color = getColors(isDark ? 'dark' : 'light');

  const rootStyle = { flex: 1 };
  const safeAreaStyle = { backgroundColor: color.background.primary };

  useEffect(() => {
    // FIXME: перед релизом заменить на react-native-bootsplash:
    // 1. yarn add react-native-bootsplash && cd ios && pod install
    // 2. Настроить нативные ресурсы (логотип, цвет фона) под iOS и Android
    // 3. Вызвать BootSplash.hide({ fade: true }) после initDB() + load()
    //    чтобы пользователь видел нативный splash пока загружаются ресурсы
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
          <BottomTabNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
