import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, View } from 'react-native';

import type { UserSelectableAIModelId, WhisperModelId } from '@/entities/settings';
import {
  buildAutoModelMetaChips,
  buildCloudModelMetaChips,
  getOnboardingCuratedCloudModels,
  getWhisperEstimatedDownloadSizeMb,
  getWhisperModelVariantId,
  shouldShowOnboardingAllModelsHint,
  useRecommendedWhisperModelId,
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
} from '@/entities/settings';
import { useModelManager } from '@/features/model-manager';
import { useProEntitlement } from '@/features/pro-license';
import { getSpeedLabel } from '@/screens/settings/config';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { formatFileSize, getWhisperLabel } from '@/shared/lib/whisper';

import { OnboardingCloudModelRow } from './OnboardingCloudModelRow';
import { OnboardingWhisperModelRow } from './OnboardingWhisperModelRow';

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
  const { isProActive } = useProEntitlement();
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

  const listCardStyle = {
    backgroundColor: color.background.card,
    borderWidth: 1,
    borderColor: color.border.default,
  } as const;

  if (mode === 'ai') {
    const curatedCloudModels = getOnboardingCuratedCloudModels(isProActive);
    const showAllModelsHint = shouldShowOnboardingAllModelsHint(isProActive);
    const manualRows = curatedCloudModels.map((model) => ({
      id: model.id,
      tierLabel: t(model.tierLabelKey),
      name: model.name,
      description: t(model.descriptionKey as 'aiModels.geminiDesc'),
      metaChips: buildCloudModelMetaChips(model, t),
    }));
    const rowCount = 1 + manualRows.length;

    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
      >
        <View className="overflow-hidden rounded-2xl" style={listCardStyle}>
          <OnboardingCloudModelRow
            tierLabel={t('aiModels.tierAuto')}
            name={t('aiModels.autoName')}
            description={t('aiModels.autoDescription')}
            metaChips={buildAutoModelMetaChips(t)}
            isRecommended
            isSelected={aiModelRoutingMode === 'auto'}
            isLast={rowCount === 1}
            color={color}
            selectedColor={selectedColor}
            onPress={() => {
              hapticSelection();
              setAiModelRoutingMode('auto');
            }}
          />
          {manualRows.map((row, index) => (
            <OnboardingCloudModelRow
              key={row.id}
              tierLabel={row.tierLabel}
              name={row.name}
              description={row.description}
              metaChips={row.metaChips}
              isSelected={aiModelRoutingMode === 'manual' && row.id === selectedAIModel}
              isLast={index === manualRows.length - 1}
              color={color}
              selectedColor={selectedColor}
              onPress={() => {
                hapticSelection();
                setAiModelRoutingMode('manual');
                setAIModel(row.id as UserSelectableAIModelId);
              }}
            />
          ))}
        </View>
        {showAllModelsHint ? (
          <Text
            className="mt-3 px-1 text-center text-[13px] leading-5"
            style={{ color: color.text.muted }}
          >
            {t('onboarding.allAiModelsInSettingsHint')}
          </Text>
        ) : null}
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

  const visibleWhisperModels = WHISPER_MODELS.filter((model) => model.id !== 'whisper-medium');

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={true}
    >
      <View className="overflow-hidden rounded-2xl" style={listCardStyle}>
        {visibleWhisperModels.map((model, index) => {
          const variantId = getWhisperModelVariantId(model.id, 'q5_1');
          const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
          const isDownloading = status === 'downloading';
          const isDownloaded = status === 'downloaded';
          const compat = compatibility?.[model.id];
          const isLast = index === visibleWhisperModels.length - 1;
          const isSelected = model.id === selectedWhisperModel;
          const displaySize = formatFileSize(
            getWhisperEstimatedDownloadSizeMb(model.id, 'q5_1') * 1024 * 1024,
          );
          const compatHint =
            compat && !compat.isCompatible
              ? compat.reason
              : t(model.description as 'whisper.models.tinyDesc');

          return (
            <OnboardingWhisperModelRow
              key={model.id}
              title={getWhisperLabel(model.id)}
              metaChips={[
                { key: 'speed', label: getSpeedLabel(model.speed) },
                { key: 'size', label: displaySize },
              ]}
              compatHint={compatHint}
              isSelected={isSelected}
              isRecommended={model.id === recommendedModelId}
              isDownloaded={isDownloaded}
              isDownloading={isDownloading}
              isLast={isLast}
              color={color}
              selectedColor={selectedColor}
              onPress={() => handleWhisperRowPress(model.id)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
};
