import type { TFunction } from 'i18next';
import { Bell, Mic } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import type { MicPermissionStatus } from '@/shared/lib/permissions';
import type { PushPermissionStatus } from '@/shared/lib/push';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import { SettingsPermissionStatusBadge } from '../SettingsPermissionStatusBadge';

type Props = {
  color: Colors;
  t: TFunction;
  micStatus: MicPermissionStatus | null;
  pushStatus: PushPermissionStatus | null;
  onMicPress: () => void;
  onNotificationsPress: () => void;
};

export const SettingsPermissionsSection = ({
  color,
  t,
  micStatus,
  pushStatus,
  onMicPress,
  onNotificationsPress,
}: Props) => (
  <SettingsSection title={t('settings.permissionsSection')}>
    <SettingsRow
      label={t('settings.permissionMicrophone')}
      leftIcon={<Mic size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={micStatus === 'granted' ? undefined : onMicPress}
      showChevron={micStatus !== 'granted'}
      rightSlot={
        micStatus !== null ? (
          <SettingsPermissionStatusBadge
            status={micStatus}
            color={color}
            labelGranted={t('settings.permissionGranted')}
            labelDenied={t('settings.permissionDenied')}
            labelNotDetermined={t('settings.permissionNotDetermined')}
          />
        ) : null
      }
      isFirst
      isLast={!IS_IOS}
    />
    {IS_IOS && (
      <SettingsRow
        label={t('settings.permissionNotifications')}
        leftIcon={<Bell size={20} color={color.accent.primary} strokeWidth={1.8} />}
        onPress={pushStatus === 'granted' ? undefined : onNotificationsPress}
        showChevron={pushStatus !== 'granted'}
        rightSlot={
          pushStatus !== null ? (
            <SettingsPermissionStatusBadge
              status={pushStatus}
              color={color}
              labelGranted={t('settings.permissionGranted')}
              labelDenied={t('settings.permissionDenied')}
              labelNotDetermined={t('settings.permissionNotDetermined')}
            />
          ) : null
        }
        isLast
      />
    )}
  </SettingsSection>
);
