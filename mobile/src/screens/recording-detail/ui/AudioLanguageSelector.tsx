import { MenuView } from '@react-native-menu/menu';
import { ChevronDown, Languages } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity } from 'react-native';

import type { TranscriptionLanguage } from '@/entities/settings';
import { TRANSCRIPTION_LANGUAGES } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type AudioLanguageSelectorProps = {
  value: TranscriptionLanguage;
  color: Colors;
  onSelect: (lang: TranscriptionLanguage) => void;
  surfaceBackgroundColor?: string;
};

export const AudioLanguageSelector = ({
  value,
  color,
  onSelect,
  surfaceBackgroundColor,
}: AudioLanguageSelectorProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const label = t(`recordingDetail.language.${value}`);
  const controlLabel = `${t('recordingDetail.audioLanguage')}: ${label}`;

  return (
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
        accessibilityLabel={controlLabel}
        accessibilityHint={t('recordingDetail.languageHint')}
        className="max-w-full flex-row items-center gap-2 rounded-full px-3 py-1.5"
        style={{ backgroundColor: surfaceBackgroundColor ?? color.background.card }}
        activeOpacity={0.7}
      >
        <Languages size={14} color={color.icon.muted} strokeWidth={2} />
        <Text
          className="shrink text-[13px] font-medium"
          numberOfLines={1}
          style={{ color: color.text.primary }}
        >
          {controlLabel}
        </Text>
        <ChevronDown size={14} color={color.text.secondary} strokeWidth={2} />
      </TouchableOpacity>
    </MenuView>
  );
};
