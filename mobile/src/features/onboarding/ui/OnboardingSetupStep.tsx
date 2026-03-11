import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { WhisperModelId } from '@/entities/settings';
import {
  AI_MODELS,
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
} from '@/entities/settings';
import { useModelManager } from '@/features/model-manager';
import { RECOMMENDED_MODEL_ID } from '@/screens/settings/config';
import type { Colors } from '@/shared/config';
import { formatFileSize } from '@/shared/lib/whisper';

type OnboardingSetupStepProps = {
  color: Colors;
};

export const OnboardingSetupStep = ({ color }: OnboardingSetupStepProps) => {
  const { t } = useTranslation();
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);

  const compatibility = useWhisperModelCompatibility();
  const { startDownload } = useModelManager();

  const handleWhisperPress = (id: WhisperModelId) => {
    const status = whisperModelStatuses[id] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status === 'downloaded') {
      setWhisperModel(id);
      return;
    }
    const model = WHISPER_MODELS.find((m) => m.id === id);
    if (model) {
      Alert.alert(
        t('whisper.downloadModel'),
        t('whisper.downloadConfirm', { size: model.sizeMb }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.download'), onPress: () => startDownload(id) },
        ],
      );
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-3 text-sm font-semibold" style={{ color: color.text.secondary }}>
        {t('onboarding.setupAiModel')}
      </Text>
      <View
        className="mb-5 overflow-hidden rounded-xl"
        style={{
          backgroundColor: color.background.card,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        {AI_MODELS.map((model, index) => {
          const isLast = index === AI_MODELS.length - 1;
          return (
            <TouchableOpacity
              key={model.id}
              onPress={() => setAIModel(model.id)}
              activeOpacity={0.7}
              className={`px-4 py-3 ${!isLast ? 'border-b' : ''}`}
              style={{
                backgroundColor: color.background.card,
                borderBottomColor: color.border.default,
              }}
            >
              <Text className="text-[15px] font-medium" style={{ color: color.text.primary }}>
                {model.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="mb-3 text-sm font-semibold" style={{ color: color.text.secondary }}>
        {t('onboarding.setupWhisper')}
      </Text>
      <Text className="mb-3 text-xs" style={{ color: color.text.muted }}>
        {t('onboarding.setupWhisperHint')}
      </Text>
      <View
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: color.background.card,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        {WHISPER_MODELS.map((model, index) => {
          const status = whisperModelStatuses[model.id] ?? 'not_downloaded';
          const isDownloading = status === 'downloading';
          const compat = compatibility?.[model.id];
          const isLast = index === WHISPER_MODELS.length - 1;
          const displaySize = formatFileSize(model.sizeMb * 1024 * 1024);

          return (
            <TouchableOpacity
              key={model.id}
              onPress={() => handleWhisperPress(model.id)}
              activeOpacity={0.7}
              disabled={isDownloading}
              className={`px-4 py-3 ${!isLast ? 'border-b' : ''}`}
              style={{
                backgroundColor: color.background.card,
                borderBottomColor: color.border.default,
              }}
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] font-medium" style={{ color: color.text.primary }}>
                    Whisper {model.name}
                  </Text>
                  {model.id === RECOMMENDED_MODEL_ID && (
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: color.status.processing.bg }}
                    >
                      <Text
                        className="text-[11px] font-medium"
                        style={{ color: color.status.processing.text }}
                      >
                        {t('whisper.recommended')}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs" style={{ color: color.text.muted }}>
                  {displaySize}
                  {compat && !compat.isCompatible && ` • ${compat.reason}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};
