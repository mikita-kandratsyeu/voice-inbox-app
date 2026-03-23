import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { FileText, Info, Shield, Star } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { openInAppBrowser } from '@/features/in-app-browser';
import type { Colors } from '@/shared/config';
import { getWebsiteUrl } from '@/shared/config/runtimeConfig';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
  onRateApp: () => void;
};

export const SettingsPrivacySection = ({ color, t, navigation, onRateApp }: Props) => (
  <SettingsSection title={t('settings.privacy')}>
    <SettingsRow
      label={t('settings.termsOfService')}
      leftIcon={<FileText size={20} color={color.icon.muted} strokeWidth={1.8} />}
      onPress={() => openInAppBrowser(`${getWebsiteUrl()}/terms`)}
      isFirst
    />
    <SettingsRow
      label={t('settings.privacyPolicy')}
      leftIcon={<Shield size={20} color={color.icon.muted} strokeWidth={1.8} />}
      onPress={() => openInAppBrowser(`${getWebsiteUrl()}/privacy`)}
    />
    <SettingsRow
      label={t('settings.rateApp')}
      leftIcon={<Star size={20} color={color.icon.muted} strokeWidth={1.8} />}
      onPress={onRateApp}
    />
    <SettingsRow
      label={t('settings.about')}
      leftIcon={<Info size={20} color={color.icon.muted} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('AboutApp')}
      isLast
    />
  </SettingsSection>
);
