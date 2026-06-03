import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import {
  AboutAppScreen,
  AIModelPickerScreen,
  AiSettingsScreen,
  AiUsageDashboardScreen,
  AppearanceScreen,
  AppLockSetupScreen,
  DigestScreen,
  ImportRecordsScreen,
  NotificationsScreen,
  PrivateAiModeScreen,
  PrivateRemoteServerScreen,
  SettingsScreen,
  StorageDetailsScreen,
  SupportScreen,
  TrashScreen,
  WhisperModelPickerScreen,
} from '@/screens/settings';
import { useColors } from '@/shared/config';
import { SettingsSurfaceColorProvider } from '@/shared/ui/SettingsSurfaceColorContext';

import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => {
  const color = useColors();

  return (
    <SettingsSurfaceColorProvider color={color}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="Appearance"
          component={AppearanceScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AIModelPicker"
          component={AIModelPickerScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="PrivateAiMode"
          component={PrivateAiModeScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AiSettings"
          component={AiSettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="PrivateRemoteServer"
          component={PrivateRemoteServerScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AiUsageDashboard"
          component={AiUsageDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Digest"
          component={DigestScreen}
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
          name="Trash"
          component={TrashScreen}
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
        <Stack.Screen
          name="Support"
          component={SupportScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ImportRecords"
          component={ImportRecordsScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </SettingsSurfaceColorProvider>
  );
};
