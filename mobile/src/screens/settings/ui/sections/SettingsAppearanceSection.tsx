import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { Languages, Moon } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { AppLanguage, AppTheme } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
  appLanguage: AppLanguage;
  appTheme: AppTheme;
  isPrivateMode: boolean;
};

export const SettingsAppearanceSection = ({
  color,
  t,
  navigation,
  appLanguage,
  appTheme,
  isPrivateMode,
}: Props) => (
  <SettingsSection title={t('settings.appearance')}>
    <SettingsRow
      label={t('settings.appLanguage')}
      value={t(`appearance.languageOption.${appLanguage}`)}
      leftIcon={<Languages size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('Appearance')}
      isFirst
      isLast={isPrivateMode}
    />
    {!isPrivateMode && (
      <SettingsRow
        label={t('settings.appTheme')}
        value={t(`appearance.themeOption.${appTheme}`)}
        leftIcon={<Moon size={20} color={color.accent.primary} strokeWidth={1.8} />}
        onPress={() => navigation.navigate('Appearance')}
        isLast
      />
    )}
  </SettingsSection>
);
