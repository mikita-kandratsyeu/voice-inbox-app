import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import type { BackupReminderPeriodDays } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import {
  disableBackupReminderNotifications,
  enableBackupReminderNotifications,
  syncAllBackupReminderNotifications,
} from '@/features/backup-reminder-notifications';
import {
  checkTaskNotificationPermission,
  disableTaskDeadlineNotifications,
  enableTaskDeadlineNotifications,
  requestTaskNotificationPermission,
  syncAllTaskDeadlineNotifications,
} from '@/features/task-deadline-notifications';
import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { openAppSettings } from '@/shared/lib/permissions';
import {
  checkPushPermission,
  disableAiProcessingAlerts,
  ensurePushRegistered,
  type PushPermissionStatus,
} from '@/shared/lib/push';

async function readNotificationPermission(): Promise<PushPermissionStatus> {
  if (IS_IOS) {
    return checkPushPermission();
  }
  return checkTaskNotificationPermission();
}

async function syncFeaturesWithNotificationPermission(status: PushPermissionStatus): Promise<void> {
  if (status === 'granted') {
    if (IS_IOS) {
      useSettingsStore.getState().setAiProcessingAlertsEnabled(true);
      await ensurePushRegistered();
    }
    if (useSettingsStore.getState().taskDeadlineNotificationsEnabled) {
      await syncAllTaskDeadlineNotifications();
    }
    if (useSettingsStore.getState().backupReminderNotificationsEnabled) {
      await syncAllBackupReminderNotifications();
    }
    return;
  }

  if (IS_IOS) {
    await disableAiProcessingAlerts();
  }
  await disableTaskDeadlineNotifications();
  await disableBackupReminderNotifications();
}

export function useNotificationsScreen() {
  const { t } = useTranslation();
  const color = useColors();
  const taskDeadlineNotificationsEnabled = useSettingsStore(
    (s) => s.taskDeadlineNotificationsEnabled,
  );
  const backupReminderNotificationsEnabled = useSettingsStore(
    (s) => s.backupReminderNotificationsEnabled,
  );
  const backupReminderPeriodDays = useSettingsStore((s) => s.backupReminderPeriodDays);
  const setBackupReminderPeriodDays = useSettingsStore((s) => s.setBackupReminderPeriodDays);
  const [notificationPermission, setNotificationPermission] = useState<PushPermissionStatus | null>(
    null,
  );
  const [backupReminderPeriodSheetVisible, setBackupReminderPeriodSheetVisible] = useState(false);

  const refreshNotificationPermission = useCallback(async () => {
    const status = await readNotificationPermission();
    setNotificationPermission(status);
    await syncFeaturesWithNotificationPermission(status);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshNotificationPermission();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          void refreshNotificationPermission();
        }
      });
      return () => subscription.remove();
    }, [refreshNotificationPermission]),
  );

  const handleNotificationPermission = useCallback(async () => {
    if (notificationPermission === 'denied') {
      await openAppSettings();
      return;
    }

    const status = await requestTaskNotificationPermission();
    setNotificationPermission(status);
    await syncFeaturesWithNotificationPermission(status);
  }, [notificationPermission]);

  const handleTaskDeadlineNotificationsChange = useCallback(
    async (value: boolean) => {
      if (value) {
        const permission = await readNotificationPermission();
        if (permission !== 'granted') {
          Alert.alert(
            t('settings.notificationsScreen.taskRemindersDeniedTitle'),
            t('settings.notificationsScreen.taskRemindersDeniedMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('settings.permissionOpenSettings'), onPress: () => openAppSettings() },
            ],
          );
          return;
        }

        await enableTaskDeadlineNotifications();
        return;
      }

      await disableTaskDeadlineNotifications();
    },
    [t],
  );

  const handleBackupReminderNotificationsChange = useCallback(
    async (value: boolean) => {
      if (value) {
        const permission = await readNotificationPermission();
        if (permission !== 'granted') {
          Alert.alert(
            t('settings.notificationsScreen.backupRemindersDeniedTitle'),
            t('settings.notificationsScreen.backupRemindersDeniedMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('settings.permissionOpenSettings'), onPress: () => openAppSettings() },
            ],
          );
          return;
        }

        await enableBackupReminderNotifications();
        return;
      }

      await disableBackupReminderNotifications();
    },
    [t],
  );

  const handleBackupReminderPeriodPress = useCallback(() => {
    setBackupReminderPeriodSheetVisible(true);
  }, []);

  const handleBackupReminderPeriodSheetClose = useCallback(() => {
    setBackupReminderPeriodSheetVisible(false);
  }, []);

  const handleBackupReminderPeriodSelect = useCallback(
    (days: BackupReminderPeriodDays) => {
      setBackupReminderPeriodDays(days);
      setBackupReminderPeriodSheetVisible(false);
      if (useSettingsStore.getState().backupReminderNotificationsEnabled) {
        void syncAllBackupReminderNotifications();
      }
    },
    [setBackupReminderPeriodDays],
  );

  return {
    t,
    color,
    notificationPermission,
    taskDeadlineNotificationsEnabled,
    backupReminderNotificationsEnabled,
    backupReminderPeriodDays,
    backupReminderPeriodSheetVisible,
    handleNotificationPermission,
    handleTaskDeadlineNotificationsChange,
    handleBackupReminderNotificationsChange,
    handleBackupReminderPeriodPress,
    handleBackupReminderPeriodSheetClose,
    handleBackupReminderPeriodSelect,
  };
}
