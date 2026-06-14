import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { BarChart2, Fingerprint, HardDrive, Trash2 } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../../lib/settingsIconColor';

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
      leftIcon={
        <Fingerprint
          size={20}
          color={getSettingsIconColor(color, 'fingerprint')}
          strokeWidth={1.8}
        />
      }
      onPress={() => navigation.navigate('AppLockSetup')}
      isFirst
    />
    <SettingsRow
      label={t('appStats.title')}
      leftIcon={
        <BarChart2 size={20} color={getSettingsIconColor(color, 'barChart2')} strokeWidth={1.8} />
      }
      onPress={() => navigation.navigate('AppStats')}
    />
    <SettingsRow
      label={t('settings.offlineStorage')}
      leftIcon={
        <HardDrive size={20} color={getSettingsIconColor(color, 'hardDrive')} strokeWidth={1.8} />
      }
      onPress={() => navigation.navigate('StorageDetails')}
    />
    <SettingsRow
      label={t('trash.title')}
      leftIcon={
        <Trash2 size={20} color={getSettingsIconColor(color, 'trash2')} strokeWidth={1.8} />
      }
      onPress={() => navigation.navigate('Trash')}
      isLast
    />
  </SettingsSection>
);
