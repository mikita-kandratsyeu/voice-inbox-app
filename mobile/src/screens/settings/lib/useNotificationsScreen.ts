import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
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
    return;
  }

  if (IS_IOS) {
    await disableAiProcessingAlerts();
  }
  await disableTaskDeadlineNotifications();
}

export function useNotificationsScreen() {
  const { t } = useTranslation();
  const color = useColors();
  const taskDeadlineNotificationsEnabled = useSettingsStore(
    (s) => s.taskDeadlineNotificationsEnabled,
  );
  const [notificationPermission, setNotificationPermission] = useState<PushPermissionStatus | null>(
    null,
  );

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

  return {
    t,
    color,
    notificationPermission,
    taskDeadlineNotificationsEnabled,
    handleNotificationPermission,
    handleTaskDeadlineNotificationsChange,
  };
}
