import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { useSettingsStore, type TranscriptionQualityMode } from '@/entities/settings';
import { TRANSCRIPTION_QUALITY_MODES } from '@/features/transcription/lib/transcriptionQualityMode';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type WhisperQualityModeSectionProps = {
  color: Colors;
};

export const WhisperQualityModeSection = ({ color }: WhisperQualityModeSectionProps) => {
  const { t } = useTranslation();
  const transcriptionQualityMode = useSettingsStore((s) => s.transcriptionQualityMode);
  const setTranscriptionQualityMode = useSettingsStore((s) => s.setTranscriptionQualityMode);

  return (
    <View className="mb-6 gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
        {t('whisper.qualityModeTitle')}
      </Text>
      <View
        className="flex-row rounded-xl p-1"
        style={{ backgroundColor: color.background.tertiary }}
      >
        {TRANSCRIPTION_QUALITY_MODES.map((mode) => {
          const selected = transcriptionQualityMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                hapticSelection();
                setTranscriptionQualityMode(mode as TranscriptionQualityMode);
              }}
              activeOpacity={0.8}
              className="flex-1 items-center justify-center rounded-lg px-2 py-3"
              style={{
                minHeight: 44,
                backgroundColor: selected ? color.background.card : 'transparent',
                borderWidth: selected ? 1 : 0,
                borderColor: selected ? color.accent.primary : 'transparent',
              }}
              accessibilityRole="button"
              accessibilityLabel={t(`whisper.qualityMode.${mode}`)}
              accessibilityState={{ selected }}
            >
              <Text
                className="text-center text-[14px] font-medium"
                style={{ color: selected ? color.accent.primary : color.text.secondary }}
              >
                {t(`whisper.qualityMode.${mode}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="text-xs" style={{ color: color.text.muted }}>
        {t(`whisper.qualityModeHint.${transcriptionQualityMode}`)}
      </Text>
    </View>
  );
};
