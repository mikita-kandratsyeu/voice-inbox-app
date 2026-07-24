import { MenuView } from '@react-native-menu/menu';
import { ChevronDown, Languages } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity } from 'react-native';

import type { TranscriptionLanguage } from '@/entities/settings';
import { TRANSCRIPTION_LANGUAGES } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection, inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';

import {
  RECORDING_DETAIL_METADATA_CHIP_CHEVRON_SIZE,
  RECORDING_DETAIL_METADATA_CHIP_ICON_SIZE,
  RECORDING_DETAIL_METADATA_CHIP_TEXT_CLASS,
  RECORDING_DETAIL_METADATA_CHIP_TOUCHABLE_CLASS,
} from './recordingDetailMetadataChipStyles';

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
  const titleColor = color.text.primary;

  const menuActions = useMemo<NativeMenuAction[]>(
    () => [
      {
        id: 'auto' as const,
        title: t('recordingDetail.language.auto'),
        titleColor,
        state: value === 'auto' ? 'on' : 'off',
      },
      inlineNativeMenuSection(
        'specificLanguagesSection',
        titleColor,
        TRANSCRIPTION_LANGUAGES.filter((lang) => lang !== 'auto').map((lang) => ({
          id: lang,
          title: t(`recordingDetail.language.${lang}`),
          titleColor,
          state: lang === value ? 'on' : 'off',
        })),
      ),
    ],
    [t, titleColor, value],
  );

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
      actions={menuActions}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={controlLabel}
        accessibilityHint={t('recordingDetail.languageHint')}
        className={RECORDING_DETAIL_METADATA_CHIP_TOUCHABLE_CLASS}
        style={{ backgroundColor: surfaceBackgroundColor ?? color.background.card }}
        activeOpacity={0.75}
      >
        <Languages
          size={RECORDING_DETAIL_METADATA_CHIP_ICON_SIZE}
          color={color.icon.muted}
          strokeWidth={2}
        />
        <Text
          className={RECORDING_DETAIL_METADATA_CHIP_TEXT_CLASS}
          numberOfLines={1}
          style={{ color: color.text.primary }}
        >
          {label}
        </Text>
        <ChevronDown
          size={RECORDING_DETAIL_METADATA_CHIP_CHEVRON_SIZE}
          color={color.text.secondary}
          strokeWidth={2}
        />
      </TouchableOpacity>
    </MenuView>
  );
};
