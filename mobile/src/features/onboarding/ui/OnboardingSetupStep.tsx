import { Check, Download } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { UserSelectableAIModelId, WhisperModelId } from '@/entities/settings';
import {
  getWhisperEstimatedDownloadSizeMb,
  getWhisperModelVariantId,
  USER_FACING_AI_MODELS,
  useRecommendedWhisperModelId,
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
} from '@/entities/settings';
import { useModelManager } from '@/features/model-manager';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { formatFileSize, getWhisperLabel } from '@/shared/lib/whisper';

type OnboardingSetupStepProps = {
  color: Colors;
  mode: 'ai' | 'whisper';
  selectedColor?: string;
};

export const OnboardingSetupStep = ({
  color,
  mode,
  selectedColor = color.accent.primary,
}: OnboardingSetupStepProps) => {
  const { t } = useTranslation();
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const setAiModelRoutingMode = useSettingsStore((s) => s.setAiModelRoutingMode);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);

  const compatibility = useWhisperModelCompatibility();
  const recommendedModelId = useRecommendedWhisperModelId();
  const { startDownload } = useModelManager();

  const handleWhisperSelect = (id: WhisperModelId) => {
    hapticSelection();
    setWhisperModel(id);
  };

  const handleWhisperDownload = (id: WhisperModelId) => {
    const variantId = getWhisperModelVariantId(id, 'q5_1');
    const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status === 'downloaded') return;

    const sizeMb = getWhisperEstimatedDownloadSizeMb(id, 'q5_1');
    const isSmallModel = sizeMb <= 150;

    const doDownload = () => {
      setWhisperModel(id);
      startDownload(id, { format: 'q5_1', expectedBytes: sizeMb * 1024 * 1024 });
    };

    if (isSmallModel) {
      doDownload();
    } else {
      Alert.alert(t('whisper.downloadModel'), t('whisper.downloadConfirm', { size: sizeMb }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.download'), onPress: doDownload },
      ]);
    }
  };

  if (mode === 'ai') {
    const aiOptions = [
      {
        id: 'auto',
        name: t('aiModels.autoRecommendedLabel'),
        isRecommended: true,
      },
      ...USER_FACING_AI_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        isRecommended: false,
      })),
    ];

    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
      >
        <View
          className="overflow-hidden rounded-xl"
          style={{
            backgroundColor: color.background.card,
            borderWidth: 1,
            borderColor: color.border.default,
          }}
        >
          {aiOptions.map((model, index) => {
            const isLast = index === aiOptions.length - 1;
            const isAuto = model.id === 'auto';
            const isSelected = isAuto
              ? aiModelRoutingMode === 'auto'
              : aiModelRoutingMode === 'manual' && model.id === selectedAIModel;
            return (
              <TouchableOpacity
                key={model.id}
                onPress={() => {
                  hapticSelection();
                  if (isAuto) {
                    setAiModelRoutingMode('auto');
                    return;
                  }
                  setAiModelRoutingMode('manual');
                  setAIModel(model.id as UserSelectableAIModelId);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={model.name}
                accessibilityState={{ selected: isSelected }}
                className={`px-4 py-2 flex-row items-center justify-between ${!isLast ? 'border-b' : ''}`}
                style={{
                  backgroundColor: color.background.card,
                  borderBottomColor: color.border.default,
                }}
              >
                <View className="mr-3 flex-1 flex-row flex-wrap items-center gap-2">
                  <Text className="text-[15px] font-medium" style={{ color: color.text.primary }}>
                    {model.name}
                  </Text>
                  {model.isRecommended && (
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
                {isSelected ? (
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <Check size={14} color="#ffffff" strokeWidth={2.5} />
                  </View>
                ) : (
                  <View
                    className="h-6 w-6 rounded-full"
                    style={{ borderWidth: 2, borderColor: color.border.default }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  const handleWhisperRowPress = (id: WhisperModelId) => {
    const variantId = getWhisperModelVariantId(id, 'q5_1');
    const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status === 'downloaded') {
      handleWhisperSelect(id);
    } else {
      handleWhisperDownload(id);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={true}
    >
      <View
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: color.background.card,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        {WHISPER_MODELS.map((model, index) => {
          const variantId = getWhisperModelVariantId(model.id, 'q5_1');
          const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
          const isDownloading = status === 'downloading';
          const isDownloaded = status === 'downloaded';
          const compat = compatibility?.[model.id];
          const isLast = index === WHISPER_MODELS.length - 2;
          const isSelected = model.id === selectedWhisperModel;
          const displaySize = formatFileSize(
            getWhisperEstimatedDownloadSizeMb(model.id, 'q5_1') * 1024 * 1024,
          );

          if (model.id === 'whisper-medium') {
            return null;
          }

          return (
            <TouchableOpacity
              key={model.id}
              onPress={() => handleWhisperRowPress(model.id)}
              activeOpacity={0.7}
              disabled={isDownloading}
              accessibilityRole="button"
              accessibilityLabel={`${t('whisper.a11yModelPrefix', { name: model.name })}, ${
                isDownloaded
                  ? isSelected
                    ? t('whisper.a11yRowSelected')
                    : t('whisper.a11yRowDownloaded')
                  : isDownloading
                    ? t('whisper.a11yRowDownloading')
                    : t('whisper.a11yRowNotDownloaded')
              }`}
              accessibilityState={{
                selected: isDownloaded && isSelected,
                disabled: isDownloading,
              }}
              className={`flex-row items-center justify-between px-4 py-2 ${!isLast ? 'border-b' : ''}`}
              style={{
                backgroundColor: color.background.card,
                borderBottomColor: color.border.default,
              }}
            >
              <View className="mr-3 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] font-medium" style={{ color: color.text.primary }}>
                    {getWhisperLabel(model.id)}
                  </Text>
                  {model.id === recommendedModelId && (
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
              {isDownloaded ? (
                isSelected ? (
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <Check size={14} color="#ffffff" strokeWidth={2.5} />
                  </View>
                ) : (
                  <View
                    className="h-6 w-6 rounded-full"
                    style={{ borderWidth: 2, borderColor: color.border.default }}
                  />
                )
              ) : isDownloading ? (
                <View
                  className="h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: color.status.processing.bg }}
                >
                  <ActivityIndicator size="small" color={color.status.processing.text} />
                </View>
              ) : (
                <View
                  className="h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: color.background.tertiary }}
                >
                  <Download size={14} color={selectedColor} strokeWidth={2} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};
