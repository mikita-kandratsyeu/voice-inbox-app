import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  CalendarClock,
  CloudCheck,
  LockKeyhole,
  RotateCcw,
  UploadCloud,
} from 'lucide-react-native';
import React from 'react';
import { ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { IS_IOS, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../lib/settingsIconColor';
import { useNotificationsScreen } from '../lib/useNotificationsScreen';
import { BackupReminderPeriodSheet } from './BackupReminderPeriodSheet';
import { SettingsPermissionStatusBadge } from './SettingsPermissionStatusBadge';

function NotificationSwitch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  color,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled: boolean;
  accessibilityLabel: string;
  color: ReturnType<typeof useNotificationsScreen>['color'];
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{
        false: color.background.tertiary,
        true: color.accent.primary,
      }}
      thumbColor={color.icon.onAccent}
    />
  );
}

export const NotificationsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const screen = useNotificationsScreen();
  const permissionGranted = screen.notificationPermission === 'granted';
  const switchesDisabled = !permissionGranted;

  return (
    <View style={{ flex: 1, backgroundColor: screen.color.background.secondary }}>
      <ScreenHeader
        title={screen.t('settings.notificationsScreen.title')}
        onBack={() => navigation.goBack()}
      />
      <>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: 16,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
            alignSelf: 'center',
            width: '100%',
            maxWidth: contentMaxWidth ?? windowWidth,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            className="mb-4 text-[14px] leading-5"
            style={{ color: screen.color.text.secondary }}
          >
            {screen.t('settings.notificationsScreen.intro')}
          </Text>

          <SettingsSection title={screen.t('settings.permissionsSection')}>
            <SettingsRow
              label={screen.t('settings.notificationsEntry')}
              leftIcon={
                <Bell
                  size={20}
                  color={getSettingsIconColor(screen.color, 'bell')}
                  strokeWidth={1.8}
                />
              }
              onPress={permissionGranted ? undefined : screen.handleNotificationPermission}
              showChevron={!permissionGranted}
              rightSlot={
                screen.notificationPermission !== null ? (
                  <SettingsPermissionStatusBadge
                    status={screen.notificationPermission}
                    color={screen.color}
                    labelGranted={screen.t('settings.permissionGranted')}
                    labelDenied={screen.t('settings.permissionDenied')}
                    labelNotDetermined={screen.t('settings.permissionNotDetermined')}
                  />
                ) : null
              }
              isFirst
              isLast
            />
          </SettingsSection>

          {!permissionGranted && screen.notificationPermission === 'denied' ? (
            <Text
              className="mb-4 mt-1 text-[13px] leading-[18px]"
              style={{ color: screen.color.text.muted }}
            >
              {screen.t('settings.notificationsScreen.systemDeniedHint')}
            </Text>
          ) : null}

          <SettingsSection title={screen.t('settings.notificationsScreen.notesSectionTitle')}>
            <SettingsRow
              label={screen.t('settings.permissionNotifications')}
              subtitle={
                IS_IOS
                  ? screen.t('settings.permissionNotificationsDesc')
                  : screen.t('settings.permissionNotificationsDescAndroid')
              }
              leftIcon={
                <CloudCheck
                  size={20}
                  color={getSettingsIconColor(screen.color, 'cloudCheck')}
                  strokeWidth={1.8}
                />
              }
              rightSlot={
                <NotificationSwitch
                  value={screen.aiProcessingAlertsEnabled}
                  onValueChange={screen.handleAiProcessingAlertsChange}
                  disabled={switchesDisabled}
                  accessibilityLabel={screen.t('settings.permissionNotifications')}
                  color={screen.color}
                />
              }
              showChevron={false}
              isFirst
            />
            <SettingsRow
              label={screen.t('settings.transcriptionRecoveryNotifications')}
              subtitle={screen.t('settings.transcriptionRecoveryNotificationsHint')}
              leftIcon={
                <RotateCcw
                  size={20}
                  color={getSettingsIconColor(screen.color, 'rotateCcw')}
                  strokeWidth={1.8}
                />
              }
              rightSlot={
                <NotificationSwitch
                  value={screen.transcriptionRecoveryNotificationsEnabled}
                  onValueChange={screen.handleTranscriptionRecoveryNotificationsChange}
                  disabled={switchesDisabled}
                  accessibilityLabel={screen.t('settings.transcriptionRecoveryNotifications')}
                  color={screen.color}
                />
              }
              showChevron={false}
            />
            <SettingsRow
              label={screen.t('settings.appLockRecordingNotifications')}
              subtitle={screen.t('settings.appLockRecordingNotificationsHint')}
              leftIcon={
                <LockKeyhole
                  size={20}
                  color={getSettingsIconColor(screen.color, 'lockKeyhole')}
                  strokeWidth={1.8}
                />
              }
              rightSlot={
                <NotificationSwitch
                  value={screen.appLockRecordingNotificationsEnabled}
                  onValueChange={screen.handleAppLockRecordingNotificationsChange}
                  disabled={switchesDisabled}
                  accessibilityLabel={screen.t('settings.appLockRecordingNotifications')}
                  color={screen.color}
                />
              }
              showChevron={false}
              isLast
            />
          </SettingsSection>

          <SettingsSection title={screen.t('settings.notificationsScreen.remindersSectionTitle')}>
            <SettingsRow
              label={screen.t('settings.taskDeadlineNotifications')}
              subtitle={screen.t('settings.taskDeadlineNotificationsHint')}
              leftIcon={
                <CalendarClock
                  size={20}
                  color={getSettingsIconColor(screen.color, 'calendarClock')}
                  strokeWidth={1.8}
                />
              }
              rightSlot={
                <NotificationSwitch
                  value={screen.taskDeadlineNotificationsEnabled}
                  onValueChange={screen.handleTaskDeadlineNotificationsChange}
                  disabled={switchesDisabled}
                  accessibilityLabel={screen.t('settings.taskDeadlineNotifications')}
                  color={screen.color}
                />
              }
              showChevron={false}
              isFirst
            />
            <SettingsRow
              label={screen.t('settings.backupReminderNotifications')}
              subtitle={screen.t('settings.backupReminderNotificationsHint')}
              leftIcon={
                <UploadCloud
                  size={20}
                  color={getSettingsIconColor(screen.color, 'uploadCloud')}
                  strokeWidth={1.8}
                />
              }
              rightSlot={
                <NotificationSwitch
                  value={screen.backupReminderNotificationsEnabled}
                  onValueChange={screen.handleBackupReminderNotificationsChange}
                  disabled={switchesDisabled}
                  accessibilityLabel={screen.t('settings.backupReminderNotifications')}
                  color={screen.color}
                />
              }
              showChevron={false}
              isLast={!screen.backupReminderNotificationsEnabled}
            />
            {screen.backupReminderNotificationsEnabled ? (
              <SettingsRow
                label={screen.t('settings.backupReminderPeriod')}
                value={screen.t('settings.backupReminderPeriodValue', {
                  count: screen.backupReminderPeriodDays,
                })}
                onPress={screen.handleBackupReminderPeriodPress}
                showChevron
                isLast
              />
            ) : null}
          </SettingsSection>
          <DeferredInboxBannerAd color={screen.color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
        <BackupReminderPeriodSheet
          visible={screen.backupReminderPeriodSheetVisible}
          selectedDays={screen.backupReminderPeriodDays}
          onSelect={screen.handleBackupReminderPeriodSelect}
          onClose={screen.handleBackupReminderPeriodSheetClose}
        />
      </>
    </View>
  );
};
