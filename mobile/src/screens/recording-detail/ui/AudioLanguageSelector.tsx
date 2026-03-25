import { MenuView } from '@react-native-menu/menu';
import { ChevronDown, Languages } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { TranscriptionLanguage } from '@/entities/settings';
import { TRANSCRIPTION_LANGUAGES } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type AudioLanguageSelectorProps = {
  value: TranscriptionLanguage;
  color: Colors;
  onSelect: (lang: TranscriptionLanguage) => void;
};

export const AudioLanguageSelector = ({ value, color, onSelect }: AudioLanguageSelectorProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const label = t(`recordingDetail.language.${value}`);

  return (
    <View className="gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      <View className="flex-row items-center gap-2">
        <Languages size={18} color={color.icon.muted} strokeWidth={2} />
        <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
          {t('recordingDetail.audioLanguage')}
        </Text>
      </View>
      <MenuView
        key={theme}
        themeVariant={isDark ? 'dark' : 'light'}
        onPressAction={({ nativeEvent }) => {
          hapticSelection();
          const lang = nativeEvent.event as TranscriptionLanguage;
          if (TRANSCRIPTION_LANGUAGES.includes(lang)) {
            onSelect(lang);
          }
        }}
        actions={TRANSCRIPTION_LANGUAGES.map((lang) => ({
          id: lang,
          title: t(`recordingDetail.language.${lang}`),
          titleColor: color.text.primary,
          state: lang === value ? 'on' : 'off',
        }))}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t('recordingDetail.audioLanguage')}, ${label}`}
          accessibilityHint={t('recordingDetail.languageHint')}
          className="flex-row items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: color.background.tertiary }}
          activeOpacity={0.7}
        >
          <Text className="text-[16px]" style={{ color: color.text.primary }}>
            {label}
          </Text>
          <ChevronDown size={18} color={color.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </MenuView>
      <Text className="text-xs" style={{ color: color.text.muted }}>
        {t('recordingDetail.languageHint')}
      </Text>
    </View>
  );
};
