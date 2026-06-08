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
        className="max-w-full min-h-10 flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
        style={{ backgroundColor: surfaceBackgroundColor ?? color.background.card }}
        activeOpacity={0.75}
      >
        <Languages size={16} color={color.icon.muted} strokeWidth={2} />
        <Text
          className="shrink text-[14px] font-semibold leading-[18px]"
          numberOfLines={1}
          style={{ color: color.text.primary }}
        >
          {controlLabel}
        </Text>
        <ChevronDown size={16} color={color.text.secondary} strokeWidth={2} />
      </TouchableOpacity>
    </MenuView>
  );
};
