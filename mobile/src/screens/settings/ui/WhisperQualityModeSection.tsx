import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useSettingsStore, type TranscriptionQualityMode } from '@/entities/settings';
import { TRANSCRIPTION_QUALITY_MODES } from '@/features/transcription/lib/transcriptionQualityMode';
import type { Colors } from '@/shared/config';

import { WhisperSegmentedControl } from './WhisperSegmentedControl';

type WhisperQualityModeSectionProps = {
  color: Colors;
  embedded?: boolean;
};

export const WhisperQualityModeSection = ({
  color,
  embedded = false,
}: WhisperQualityModeSectionProps) => {
  const { t } = useTranslation();
  const transcriptionQualityMode = useSettingsStore((s) => s.transcriptionQualityMode);
  const setTranscriptionQualityMode = useSettingsStore((s) => s.setTranscriptionQualityMode);

  const content = (
    <>
      <WhisperSegmentedControl
        value={transcriptionQualityMode}
        options={TRANSCRIPTION_QUALITY_MODES.map((mode) => ({
          value: mode,
          label: t(`whisper.qualityMode.${mode}`),
        }))}
        onChange={(mode) => setTranscriptionQualityMode(mode as TranscriptionQualityMode)}
        color={color}
        accessibilityLabel={t('whisper.qualityModeTitle')}
      />
      <Text className="mt-2.5 text-xs leading-4" style={{ color: color.text.muted }}>
        {t(`whisper.qualityModeHint.${transcriptionQualityMode}`)}
      </Text>
    </>
  );

  if (embedded) {
    return <View className="px-4 py-3.5">{content}</View>;
  }

  return (
    <View className="mb-6 gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
        {t('whisper.qualityModeTitle')}
      </Text>
      {content}
    </View>
  );
};
