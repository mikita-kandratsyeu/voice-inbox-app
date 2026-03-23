import { MenuView } from '@react-native-menu/menu';
import { ChevronDown, Languages } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { TranscriptionLanguage } from '@/entities/settings';
import { TRANSCRIPTION_LANGUAGES, useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type WhisperDefaultLanguageSectionProps = {
  color: Colors;
};

export const WhisperDefaultLanguageSection = ({ color }: WhisperDefaultLanguageSectionProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';

  const transcriptionLanguage = useSettingsStore((s) => s.transcriptionLanguage);
  const setTranscriptionLanguage = useSettingsStore((s) => s.setTranscriptionLanguage);

  const label = t(`recordingDetail.language.${transcriptionLanguage}`);

  return (
    <View className="mb-6 gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      <View className="flex-row items-center gap-2">
        <Languages size={18} color={color.icon.muted} strokeWidth={2} />
        <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
          {t('whisper.defaultLanguageTitle')}
        </Text>
      </View>
      <MenuView
        key={theme}
        themeVariant={isDark ? 'dark' : 'light'}
        onPressAction={({ nativeEvent }) => {
          hapticSelection();
          const lang = nativeEvent.event as TranscriptionLanguage;
          if (TRANSCRIPTION_LANGUAGES.includes(lang)) {
            setTranscriptionLanguage(lang);
          }
        }}
        actions={TRANSCRIPTION_LANGUAGES.map((lang) => ({
          id: lang,
          title: t(`recordingDetail.language.${lang}`),
          titleColor: color.text.primary,
          state: lang === transcriptionLanguage ? 'on' : 'off',
        }))}
      >
        <TouchableOpacity
          className="flex-row items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: color.background.tertiary }}
          onPress={() => hapticSelection()}
          activeOpacity={0.7}
        >
          <Text className="text-[16px]" style={{ color: color.text.primary }}>
            {label}
          </Text>
          <ChevronDown size={18} color={color.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </MenuView>
      <Text className="text-xs" style={{ color: color.text.muted }}>
        {t('whisper.defaultLanguageHint')}
      </Text>
    </View>
  );
};
