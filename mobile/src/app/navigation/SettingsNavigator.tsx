import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import {
  AboutAppScreen,
  AIModelPickerScreen,
  AppLockSetupScreen,
  SettingsScreen,
  StorageDetailsScreen,
  WhisperModelPickerScreen,
} from '@/screens/settings';

import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen
      name="AIModelPicker"
      component={AIModelPickerScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="WhisperModelPicker"
      component={WhisperModelPickerScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="StorageDetails"
      component={StorageDetailsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AppLockSetup"
      component={AppLockSetupScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AboutApp"
      component={AboutAppScreen}
      options={{ animation: 'slide_from_right' }}
    />
  </Stack.Navigator>
);
