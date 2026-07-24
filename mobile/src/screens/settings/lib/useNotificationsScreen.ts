import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import type { BackupReminderPeriodDays } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import {
  disableBackupReminderNotifications,
  enableBackupReminderNotifications,
  suspendBackupReminderNotifications,
  syncAllBackupReminderNotifications,
} from '@/features/backup-reminder-notifications';
import {
  checkTaskNotificationPermission,
  disableTaskDeadlineNotifications,
  enableTaskDeadlineNotifications,
  requestTaskNotificationPermission,
  suspendTaskDeadlineNotifications,
  syncAllTaskDeadlineNotifications,
} from '@/features/task-deadline-notifications';
import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { openAppSettings } from '@/shared/lib/permissions';
import {
  checkPushPermission,
  ensurePushRegistered,
  type PushPermissionStatus,
  requestPushPermission,
} from '@/shared/lib/push';

async function readNotificationPermission(): Promise<PushPermissionStatus> {
  if (IS_IOS) {
    return checkPushPermission();
  }
  return checkTaskNotificationPermission();
}

async function requestNotificationPermission(): Promise<PushPermissionStatus> {
  if (IS_IOS) {
    return requestPushPermission();
  }
  return requestTaskNotificationPermission();
}

async function syncFeaturesWithNotificationPermission(status: PushPermissionStatus): Promise<void> {
  if (status === 'granted') {
    if (IS_IOS) {
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

  await suspendTaskDeadlineNotifications();
  await suspendBackupReminderNotifications();
}

function showPermissionDeniedAlert(
  t: ReturnType<typeof useTranslation>['t'],
  titleKey: string,
  messageKey: string,
): void {
  Alert.alert(t(titleKey), t(messageKey), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('settings.permissionOpenSettings'), onPress: () => openAppSettings() },
  ]);
}

export function useNotificationsScreen() {
  const { t } = useTranslation();
  const color = useColors();
  const transcriptionRecoveryNotificationsEnabled = useSettingsStore(
    (s) => s.transcriptionRecoveryNotificationsEnabled,
  );
  const appLockRecordingNotificationsEnabled = useSettingsStore(
    (s) => s.appLockRecordingNotificationsEnabled,
  );
  const taskDeadlineNotificationsEnabled = useSettingsStore(
    (s) => s.taskDeadlineNotificationsEnabled,
  );
  const backupReminderNotificationsEnabled = useSettingsStore(
    (s) => s.backupReminderNotificationsEnabled,
  );
  const backupReminderPeriodDays = useSettingsStore((s) => s.backupReminderPeriodDays);
  const setTranscriptionRecoveryNotificationsEnabled = useSettingsStore(
    (s) => s.setTranscriptionRecoveryNotificationsEnabled,
  );
  const setAppLockRecordingNotificationsEnabled = useSettingsStore(
    (s) => s.setAppLockRecordingNotificationsEnabled,
  );
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

    const status = await requestNotificationPermission();
    setNotificationPermission(status);
    await syncFeaturesWithNotificationPermission(status);
  }, [notificationPermission]);

  const ensurePermissionForToggle = useCallback(async (): Promise<boolean> => {
    const permission = await readNotificationPermission();
    if (permission === 'granted') {
      return true;
    }
    return false;
  }, []);

  const handleTranscriptionRecoveryNotificationsChange = useCallback(
    async (value: boolean) => {
      if (value && !(await ensurePermissionForToggle())) {
        showPermissionDeniedAlert(
          t,
          'settings.notificationsScreen.aiAlertsDeniedTitle',
          'settings.notificationsScreen.aiAlertsDeniedMessage',
        );
        return;
      }
      setTranscriptionRecoveryNotificationsEnabled(value);
    },
    [ensurePermissionForToggle, setTranscriptionRecoveryNotificationsEnabled, t],
  );

  const handleAppLockRecordingNotificationsChange = useCallback(
    async (value: boolean) => {
      if (value && !(await ensurePermissionForToggle())) {
        showPermissionDeniedAlert(
          t,
          'settings.notificationsScreen.aiAlertsDeniedTitle',
          'settings.notificationsScreen.aiAlertsDeniedMessage',
        );
        return;
      }
      setAppLockRecordingNotificationsEnabled(value);
    },
    [ensurePermissionForToggle, setAppLockRecordingNotificationsEnabled, t],
  );

  const handleTaskDeadlineNotificationsChange = useCallback(
    async (value: boolean) => {
      if (value) {
        const permission = await readNotificationPermission();
        if (permission !== 'granted') {
          showPermissionDeniedAlert(
            t,
            'settings.notificationsScreen.taskRemindersDeniedTitle',
            'settings.notificationsScreen.taskRemindersDeniedMessage',
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
          showPermissionDeniedAlert(
            t,
            'settings.notificationsScreen.backupRemindersDeniedTitle',
            'settings.notificationsScreen.backupRemindersDeniedMessage',
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
    transcriptionRecoveryNotificationsEnabled,
    appLockRecordingNotificationsEnabled,
    taskDeadlineNotificationsEnabled,
    backupReminderNotificationsEnabled,
    backupReminderPeriodDays,
    backupReminderPeriodSheetVisible,
    handleNotificationPermission,
    handleTranscriptionRecoveryNotificationsChange,
    handleAppLockRecordingNotificationsChange,
    handleTaskDeadlineNotificationsChange,
    handleBackupReminderNotificationsChange,
    handleBackupReminderPeriodPress,
    handleBackupReminderPeriodSheetClose,
    handleBackupReminderPeriodSelect,
  };
}
