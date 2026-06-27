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
  WHISPER_KIT_STORAGE_FORMAT,
  WHISPER_MODELS,
} from '@/entities/settings';
import { useModelManager } from '@/features/model-manager';
import { useProEntitlement } from '@/features/pro-license';
import { getSpeedLabel } from '@/screens/settings/config';
import { IOS_WHISPER_KIT_MODELS } from '@/screens/settings/lib/iosWhisperKitModels';
import { WhisperEngineModeSection } from '@/screens/settings/ui/WhisperEngineModeSection';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { IS_IOS } from '@/shared/lib/platform';
import {
  formatFileSize,
  getWhisperLabel,
  getWhisperModelShortLabelKey,
} from '@/shared/lib/whisper';
import { getWhisperKitEstimatedDownloadMb } from '@/shared/lib/whisper/whisperKitModelPath';

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
  const iosWhisperKitEngineEnabled = useSettingsStore((s) => s.iosWhisperKitEngineEnabled);
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const setAiModelRoutingMode = useSettingsStore((s) => s.setAiModelRoutingMode);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);

  const compatibility = useWhisperModelCompatibility();
  const recommendedModelId = useRecommendedWhisperModelId();
  const { startDownload } = useModelManager();

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

  const useIosWhisperKit = IS_IOS && iosWhisperKitEngineEnabled;
  const whisperWeightsFormat = useIosWhisperKit ? WHISPER_KIT_STORAGE_FORMAT : 'q5_1';

  const resolveWhisperVariantId = (id: WhisperModelId) =>
    getWhisperModelVariantId(id, whisperWeightsFormat);

  const hasActiveWhisperDownload = Object.values(whisperModelStatuses).some(
    (status) => status === 'downloading',
  );

  const handleWhisperSelect = (id: WhisperModelId) => {
    hapticSelection();
    setWhisperModel(id);
  };

  const getWhisperDownloadSizeMb = (id: WhisperModelId) =>
    useIosWhisperKit
      ? getWhisperKitEstimatedDownloadMb(id)
      : getWhisperEstimatedDownloadSizeMb(id, 'q5_1');

  const handleWhisperDownload = (id: WhisperModelId) => {
    const variantId = resolveWhisperVariantId(id);
    const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status === 'downloaded') return;

    const sizeMb = getWhisperDownloadSizeMb(id);
    const isSmallModel = sizeMb <= 150;

    const doDownload = () => {
      setWhisperModel(id);
      if (useIosWhisperKit) {
        startDownload(id, { expectedBytes: sizeMb * 1024 * 1024 });
        return;
      }
      startDownload(id, {
        format: 'q5_1',
        expectedBytes: sizeMb * 1024 * 1024,
      });
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

  const handleWhisperRowPress = (id: WhisperModelId) => {
    const variantId = resolveWhisperVariantId(id);
    const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status === 'downloaded') {
      handleWhisperSelect(id);
    } else {
      handleWhisperDownload(id);
    }
  };

  const visibleWhisperModels = useIosWhisperKit
    ? IOS_WHISPER_KIT_MODELS
    : WHISPER_MODELS.filter((model) => model.id !== 'whisper-medium');

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={true}
    >
      {IS_IOS ? (
        <View className="mb-4 overflow-hidden rounded-2xl" style={listCardStyle}>
          <WhisperEngineModeSection
            color={color}
            embedded
            hasActiveWhisperDownload={hasActiveWhisperDownload}
          />
        </View>
      ) : null}

      <View className="overflow-hidden rounded-2xl" style={listCardStyle}>
        {visibleWhisperModels.map((model, index) => {
          const variantId = resolveWhisperVariantId(model.id);
          const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
          const isDownloading = status === 'downloading';
          const isDownloaded = status === 'downloaded';
          const compat = compatibility?.[model.id];
          const isLast = index === visibleWhisperModels.length - 1;
          const isSelected = model.id === selectedWhisperModel;
          const displaySize = formatFileSize(getWhisperDownloadSizeMb(model.id) * 1024 * 1024);
          const compatHint = useIosWhisperKit
            ? t('whisper.iosModelOnDemandHint')
            : compat && !compat.isCompatible
              ? compat.reason
              : t(model.description as 'whisper.models.tinyDesc');

          return (
            <OnboardingWhisperModelRow
              key={model.id}
              title={
                useIosWhisperKit
                  ? t(getWhisperModelShortLabelKey(model.id))
                  : getWhisperLabel(model.id)
              }
              metaChips={
                useIosWhisperKit
                  ? [{ key: 'size', label: displaySize }]
                  : [
                      { key: 'speed', label: getSpeedLabel(model.speed) },
                      { key: 'size', label: displaySize },
                    ]
              }
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
