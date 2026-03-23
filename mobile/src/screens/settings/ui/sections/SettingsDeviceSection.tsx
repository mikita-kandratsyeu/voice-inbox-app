import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { Fingerprint, HardDrive } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
  isAppLockEnabled: boolean;
};

export const SettingsDeviceSection = ({ color, t, navigation, isAppLockEnabled }: Props) => (
  <SettingsSection title={t('settings.device')}>
    <SettingsRow
      label={t('settings.appLock')}
      value={isAppLockEnabled ? t('settings.on') : t('settings.off')}
      leftIcon={<Fingerprint size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('AppLockSetup')}
      isFirst
    />
    <SettingsRow
      label={t('settings.offlineStorage')}
      leftIcon={<HardDrive size={20} color={color.accent.success} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('StorageDetails')}
      isLast
    />
  </SettingsSection>
);
