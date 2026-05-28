import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { Bell, Mic } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { Colors } from '@/shared/config';
import type { MicPermissionStatus } from '@/shared/lib/permissions';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import { SettingsPermissionStatusBadge } from '../SettingsPermissionStatusBadge';

type Props = {
  color: Colors;
  t: TFunction;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
  micStatus: MicPermissionStatus | null;
  onMicPress: () => void;
};

export const SettingsPermissionsSection = ({
  color,
  t,
  navigation,
  micStatus,
  onMicPress,
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
    />
    <SettingsRow
      label={t('settings.notificationsEntry')}
      leftIcon={<Bell size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('Notifications')}
      isLast
    />
  </SettingsSection>
);
