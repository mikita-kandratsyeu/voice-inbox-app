import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { type TranscriptionQualityMode, useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { TranscriptionQualityModeSlider } from './TranscriptionQualityModeSlider';

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

  const slider = (
    <TranscriptionQualityModeSlider
      value={transcriptionQualityMode}
      onChange={setTranscriptionQualityMode}
      fullLabel={(mode: TranscriptionQualityMode) => t(`whisper.qualityMode.${mode}`)}
      tickLabel={(mode: TranscriptionQualityMode) => t(`whisper.qualityMode.${mode}`)}
      sliderAccessibilityLabel={t('whisper.qualityModeSliderA11yLabel')}
      color={color}
      embedded={embedded}
    />
  );

  const content = (
    <>
      {!embedded ? (
        <Text className="mb-2 text-sm font-medium" style={{ color: color.text.primary }}>
          {t('whisper.qualityModeTitle')}
        </Text>
      ) : null}
      {embedded ? (
        slider
      ) : (
        <View
          className="overflow-hidden rounded-2xl"
          style={{ borderWidth: 1, borderColor: color.border.default }}
        >
          {slider}
        </View>
      )}
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
      {content}
    </View>
  );
};
