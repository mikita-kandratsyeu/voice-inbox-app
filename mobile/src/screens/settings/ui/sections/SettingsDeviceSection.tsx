import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { Fingerprint, HardDrive, Smartphone, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Switch, View } from 'react-native';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../../lib/settingsIconColor';

type Props = {
  color: Colors;
  t: TFunction;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
  isAppLockEnabled: boolean;
  shakeToRecordEnabled: boolean;
  setShakeToRecordEnabled: (value: boolean) => void;
};

export const SettingsDeviceSection = ({
  color,
  t,
  navigation,
  isAppLockEnabled,
  shakeToRecordEnabled,
  setShakeToRecordEnabled,
}: Props) => (
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
      label={t('settings.shakeToRecord.title')}
      subtitle={t('settings.shakeToRecord.subtitle')}
      leftIcon={
        <Smartphone size={20} color={getSettingsIconColor(color, 'mic')} strokeWidth={1.8} />
      }
      rightSlot={
        <View className="flex-row items-center gap-2" pointerEvents="box-none">
          <Switch
            value={shakeToRecordEnabled}
            onValueChange={setShakeToRecordEnabled}
            accessibilityLabel={t('settings.shakeToRecord.title')}
            trackColor={{
              false: color.background.tertiary,
              true: color.accent.primary,
            }}
            thumbColor={color.icon.onAccent}
          />
        </View>
      }
      showChevron={false}
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
