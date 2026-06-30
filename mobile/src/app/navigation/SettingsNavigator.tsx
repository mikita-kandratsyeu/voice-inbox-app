import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { GithubSyncScreen } from '@/features/github-sync';
import { GitlabSyncScreen } from '@/features/gitlab-sync';
import { IcloudSyncScreen } from '@/features/icloud-sync';
import {
  AboutAppScreen,
  AIModelPickerScreen,
  AiSettingsScreen,
  AiUsageDashboardScreen,
  AppearanceScreen,
  AppLockSetupScreen,
  BackupRestoreScreen,
  DiagnosticLogsScreen,
  DigestScreen,
  GesturesSettingsScreen,
  ImportRecordsScreen,
  NotificationsScreen,
  PrivateAiModeScreen,
  PrivateAiQueueScreen,
  PrivateRemoteServerScreen,
  SettingsScreen,
  SiriShortcutsScreen,
  StorageDetailsScreen,
  SupportScreen,
  TrashScreen,
  WhisperModelPickerScreen,
} from '@/screens/settings';
import { useColors } from '@/shared/config';
import { SettingsSurfaceColorProvider } from '@/shared/ui/SettingsSurfaceColorContext';

import { CARD_PUSH_OPTIONS, NESTED_STACK_DEFAULTS } from './screenOptions';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => {
  const color = useColors();

  return (
    <SettingsSurfaceColorProvider color={color}>
      <Stack.Navigator screenOptions={NESTED_STACK_DEFAULTS}>
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Appearance" component={AppearanceScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen
          name="AIModelPicker"
          component={AIModelPickerScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen
          name="PrivateAiMode"
          component={PrivateAiModeScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen name="AiSettings" component={AiSettingsScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen
          name="PrivateRemoteServer"
          component={PrivateRemoteServerScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen
          name="PrivateAiQueue"
          component={PrivateAiQueueScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen
          name="AiUsageDashboard"
          component={AiUsageDashboardScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen
          name="SiriShortcuts"
          component={SiriShortcutsScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen name="Digest" component={DigestScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen
          name="WhisperModelPicker"
          component={WhisperModelPickerScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen
          name="StorageDetails"
          component={StorageDetailsScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen name="Trash" component={TrashScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen
          name="AppLockSetup"
          component={AppLockSetupScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen name="AboutApp" component={AboutAppScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen
          name="DiagnosticLogs"
          component={DiagnosticLogsScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen name="Support" component={SupportScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen
          name="Gestures"
          component={GesturesSettingsScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen
          name="ImportRecords"
          component={ImportRecordsScreen}
          options={CARD_PUSH_OPTIONS}
        />
        <Stack.Screen name="GithubSync" component={GithubSyncScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen name="GitlabSync" component={GitlabSyncScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen name="IcloudSync" component={IcloudSyncScreen} options={CARD_PUSH_OPTIONS} />
        <Stack.Screen
          name="BackupRestore"
          component={BackupRestoreScreen}
          options={CARD_PUSH_OPTIONS}
        />
      </Stack.Navigator>
    </SettingsSurfaceColorProvider>
  );
};
