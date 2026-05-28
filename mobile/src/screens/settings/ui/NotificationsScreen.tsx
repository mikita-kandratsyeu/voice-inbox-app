import { useNavigation } from '@react-navigation/native';
import { Bell, CalendarDays } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { IS_IOS, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { useNotificationsScreen } from '../lib/useNotificationsScreen';
import { SettingsPermissionStatusBadge } from './SettingsPermissionStatusBadge';

export const NotificationsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const screen = useNotificationsScreen();
  const permissionGranted = screen.notificationPermission === 'granted';

  return (
    <View style={{ flex: 1, backgroundColor: screen.color.background.secondary }}>
      <ScreenHeader
        title={screen.t('settings.notificationsScreen.title')}
        onBack={() => navigation.goBack()}
      />
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
          className="mb-4 text-[15px] leading-[22px]"
          style={{ color: screen.color.text.secondary }}
        >
          {screen.t('settings.notificationsScreen.intro')}
        </Text>

        <SettingsSection title={screen.t('settings.permissionsSection')}>
          <SettingsRow
            label={screen.t('settings.notificationsEntry')}
            leftIcon={<Bell size={20} color={screen.color.accent.primary} strokeWidth={1.8} />}
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

        <SettingsSection title={screen.t('settings.notificationsScreen.sectionTitle')}>
          {IS_IOS ? (
            <SettingsRow
              label={screen.t('settings.permissionNotifications')}
              subtitle={screen.t('settings.permissionNotificationsDesc')}
              leftIcon={<Bell size={20} color={screen.color.accent.primary} strokeWidth={1.8} />}
              value={
                permissionGranted
                  ? screen.t('settings.notificationsScreen.aiAlertsFollowsSystem')
                  : undefined
              }
              showChevron={false}
              isFirst
            />
          ) : null}
          <SettingsRow
            label={screen.t('settings.taskDeadlineNotifications')}
            subtitle={screen.t('settings.taskDeadlineNotificationsHint')}
            leftIcon={
              <CalendarDays size={20} color={screen.color.accent.primary} strokeWidth={1.8} />
            }
            rightSlot={
              <Switch
                value={screen.taskDeadlineNotificationsEnabled}
                onValueChange={screen.handleTaskDeadlineNotificationsChange}
                disabled={!permissionGranted}
                accessibilityLabel={screen.t('settings.taskDeadlineNotifications')}
                trackColor={{
                  false: screen.color.background.tertiary,
                  true: screen.color.accent.primary,
                }}
                thumbColor={screen.color.icon.onAccent}
              />
            }
            showChevron={false}
            isFirst={!IS_IOS}
            isLast
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
};
