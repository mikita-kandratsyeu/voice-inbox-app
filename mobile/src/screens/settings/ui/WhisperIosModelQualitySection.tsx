import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import {
  useRecommendedWhisperModelId,
  useSettingsStore,
  type WhisperModelId,
} from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { getWhisperLabel } from '@/shared/lib/whisper';

const IOS_WHISPER_QUALITY_MODEL_IDS = [
  'whisper-base',
  'whisper-small',
  'whisper-medium',
] as const satisfies readonly WhisperModelId[];

type WhisperIosModelQualitySectionProps = {
  color: Colors;
};

export const WhisperIosModelQualitySection = ({ color }: WhisperIosModelQualitySectionProps) => {
  const { t } = useTranslation();
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);
  const recommendedModelId = useRecommendedWhisperModelId();

  return (
    <View className="mb-6 gap-3 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
        {t('whisper.iosModelQualityTitle')}
      </Text>
      <Text className="text-xs" style={{ color: color.text.muted }}>
        {t('whisper.iosModelQualityHint')}
      </Text>
      <View className="gap-2">
        {IOS_WHISPER_QUALITY_MODEL_IDS.map((modelId) => {
          const selected = selectedWhisperModel === modelId;
          const recommended = modelId === recommendedModelId;

          return (
            <TouchableOpacity
              key={modelId}
              onPress={() => {
                hapticSelection();
                setWhisperModel(modelId);
              }}
              activeOpacity={0.8}
              className="rounded-xl px-4 py-3"
              style={{
                minHeight: 44,
                backgroundColor: selected ? color.background.tertiary : color.background.secondary,
                borderWidth: selected ? 1 : 0,
                borderColor: selected ? color.accent.primary : 'transparent',
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={getWhisperLabel(modelId)}
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className="text-[15px] font-medium"
                  style={{ color: selected ? color.accent.primary : color.text.primary }}
                >
                  {getWhisperLabel(modelId)}
                </Text>
                {recommended ? (
                  <Text className="text-xs font-medium" style={{ color: color.accent.primary }}>
                    {t('whisper.recommended')}
                  </Text>
                ) : null}
              </View>
              <Text className="mt-1 text-xs" style={{ color: color.text.muted }}>
                {t(`whisper.iosModelQuality.${modelId}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
