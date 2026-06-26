import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import {
  getWhisperEstimatedDownloadSizeMb,
  getWhisperKitModelVariantId,
  getWhisperModelVariantId,
  useRecommendedWhisperModelId,
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
  type WhisperModelId,
  type WhisperModelVariantId,
} from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import {
  getWhisperKitModelStorageBytes,
  getWhisperVariantDisplaySizeBytes,
  isWhisperModelSelectable,
  useModelManager,
} from '@/features/model-manager';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { IS_IOS } from '@/shared/lib/platform';
import {
  formatFileSize,
  getWhisperModelShortLabelKey,
  isWhisperCoreMlEncoderInstalled,
} from '@/shared/lib/whisper';
import { getWhisperKitEstimatedDownloadMb } from '@/shared/lib/whisper/whisperKitModelPath';
import { ScreenHeader, SettingsSection } from '@/shared/ui';

import { IOS_WHISPER_KIT_MODELS } from '../lib/iosWhisperKitModels';
import { WhisperDefaultLanguageSection } from './WhisperDefaultLanguageSection';
import { WhisperEngineModeSection } from './WhisperEngineModeSection';
import { WhisperModelCard } from './WhisperModelCard';
import { WhisperQualityModeSection } from './WhisperQualityModeSection';
import { WhisperWeightsFormatSection } from './WhisperWeightsFormatSection';

export const WhisperModelPickerScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = useIsTablet();

  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const whisperDownloadProgress = useSettingsStore((s) => s.whisperDownloadProgress);
  const whisperDownloadBytes = useSettingsStore((s) => s.whisperDownloadBytes);
  const whisperDownloadPhase = useSettingsStore((s) => s.whisperDownloadPhase);
  const selectedWhisperModelFormat = useSettingsStore((s) => s.selectedWhisperModelFormat);
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);
  const iosWhisperKitEngineEnabled = useSettingsStore((s) => s.iosWhisperKitEngineEnabled);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);

  const compatibility = useWhisperModelCompatibility();
  const recommendedModelId = useRecommendedWhisperModelId();
  const {
    startDownload,
    cancelDownload,
    removeModel,
    syncWhisperKitDownloadedStatuses,
    syncDownloadedStatusesForFormat,
  } = useModelManager();

  const useIosWhisperKit = IS_IOS && iosWhisperKitEngineEnabled;
  const showIosEnginePicker = IS_IOS;

  const resolveModelVariantId = useCallback(
    (modelId: WhisperModelId): WhisperModelVariantId =>
      useIosWhisperKit
        ? getWhisperKitModelVariantId(modelId)
        : getWhisperModelVariantId(modelId, whisperModelWeightsFormat),
    [useIosWhisperKit, whisperModelWeightsFormat],
  );

  const [realSizes, setRealSizes] = useState<Partial<Record<WhisperModelVariantId, string>>>({});
  const [coreMlEncoderActive, setCoreMlEncoderActive] = useState<
    Partial<Record<WhisperModelId, boolean>>
  >({});
  const refreshRequestIdRef = useRef(0);
  const coreMlRequestIdRef = useRef(0);
  const hasActiveWhisperDownload = Object.values(whisperModelStatuses).some(
    (status) => status === 'downloading',
  );

  useFocusEffect(
    useCallback(() => {
      if (useIosWhisperKit) {
        void syncWhisperKitDownloadedStatuses();
      } else {
        void syncDownloadedStatusesForFormat(whisperModelWeightsFormat);
      }
    }, [
      syncDownloadedStatusesForFormat,
      syncWhisperKitDownloadedStatuses,
      useIosWhisperKit,
      whisperModelWeightsFormat,
    ]),
  );

  const refreshRealSizes = useCallback(async () => {
    const requestId = ++refreshRequestIdRef.current;
    const models = useIosWhisperKit ? IOS_WHISPER_KIT_MODELS : WHISPER_MODELS;

    const entries = await Promise.all(
      models.map(async (m) => {
        const variantId = resolveModelVariantId(m.id);
        const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
        const downloaded = status === 'downloaded';

        if (useIosWhisperKit) {
          const bytes = downloaded ? await getWhisperKitModelStorageBytes(m.id) : 0;
          if (bytes <= 0) {
            return [variantId, null] as const;
          }
          return [variantId, formatFileSize(bytes)] as const;
        }

        const bytes = await getWhisperVariantDisplaySizeBytes(m.id, whisperModelWeightsFormat, {
          downloaded,
        });
        if (bytes <= 0) return [variantId, null] as const;
        return [variantId, formatFileSize(bytes)] as const;
      }),
    );

    if (requestId !== refreshRequestIdRef.current) {
      return;
    }

    setRealSizes((prev) => {
      const next = { ...prev };
      for (const [id, size] of entries) {
        if (size) next[id] = size;
        else delete next[id];
      }
      return next;
    });
  }, [resolveModelVariantId, useIosWhisperKit, whisperModelStatuses, whisperModelWeightsFormat]);

  const refreshCoreMlEncoderPresence = useCallback(async () => {
    if (!IS_IOS || useIosWhisperKit) {
      setCoreMlEncoderActive({});
      return;
    }

    const requestId = ++coreMlRequestIdRef.current;
    const entries = await Promise.all(
      WHISPER_MODELS.map(async (m) => {
        const installed = await isWhisperCoreMlEncoderInstalled(m.id);
        return [m.id, installed] as const;
      }),
    );

    if (requestId !== coreMlRequestIdRef.current) {
      return;
    }

    setCoreMlEncoderActive(Object.fromEntries(entries) as Record<WhisperModelId, boolean>);
  }, [useIosWhisperKit]);

  useEffect(() => {
    refreshRealSizes();
  }, [refreshRealSizes]);

  useEffect(() => {
    void refreshCoreMlEncoderPresence();
  }, [refreshCoreMlEncoderPresence]);

  const handleDownload = async (id: WhisperModelId) => {
    const sizeMb = useIosWhisperKit
      ? getWhisperKitEstimatedDownloadMb(id)
      : getWhisperEstimatedDownloadSizeMb(id, whisperModelWeightsFormat, {
          coreMlAlreadyInstalled: IS_IOS ? coreMlEncoderActive[id] === true : false,
        });

    Alert.alert(t('whisper.downloadModel'), t('whisper.downloadConfirm', { size: sizeMb }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.download'),
        onPress: () =>
          startDownload(id, {
            format: whisperModelWeightsFormat,
            expectedBytes: sizeMb * 1024 * 1024,
          }),
      },
    ]);
  };

  const handleDelete = (id: WhisperModelId) => {
    const model = WHISPER_MODELS.find((m) => m.id === id);
    const displayName = model
      ? useIosWhisperKit
        ? t(getWhisperModelShortLabelKey(model.id))
        : model.name
      : id;

    Alert.alert(
      t('whisper.deleteModel'),
      t('whisper.deleteConfirmWithName', { name: displayName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            await removeModel(id);
            await refreshRealSizes();
            await refreshCoreMlEncoderPresence();
            if (useIosWhisperKit) {
              await syncWhisperKitDownloadedStatuses();
            }
          },
        },
      ],
    );
  };

  const handleSelect = (id: WhisperModelId) => {
    const variantId = resolveModelVariantId(id);
    const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (!isWhisperModelSelectable(status)) {
      const model = WHISPER_MODELS.find((m) => m.id === id);
      if (model) void handleDownload(id);
      return;
    }
    setWhisperModel(id);
    navigation.goBack();
  };

  const classicModels = WHISPER_MODELS.filter(
    (model) => !(whisperModelWeightsFormat === 'q5_1' && model.id === 'whisper-medium'),
  );

  const pickerModels = useIosWhisperKit ? IOS_WHISPER_KIT_MODELS : classicModels;

  const modelSectionTitle = useIosWhisperKit
    ? t('whisper.sectionRecognition')
    : t('whisper.sectionModel');

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('whisper.modelTitle')} onBack={() => navigation.goBack()} />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-6 px-1 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {useIosWhisperKit
              ? t('whisper.modelDescriptionIosShort')
              : t('whisper.modelDescriptionShort')}
          </Text>

          <SettingsSection title={t('whisper.sectionGeneral')}>
            <WhisperDefaultLanguageSection color={color} embedded />
            <WhisperQualityModeSection color={color} embedded />
          </SettingsSection>

          {showIosEnginePicker ? (
            <SettingsSection title={t('whisper.sectionEngine')}>
              <WhisperEngineModeSection
                color={color}
                embedded
                hasActiveWhisperDownload={hasActiveWhisperDownload}
              />
            </SettingsSection>
          ) : null}

          <SettingsSection title={modelSectionTitle}>
            {!useIosWhisperKit ? (
              <WhisperWeightsFormatSection
                color={color}
                embedded
                hasActiveWhisperDownload={hasActiveWhisperDownload}
              />
            ) : null}

            {pickerModels.map((model, index) => {
              const variantId = resolveModelVariantId(model.id);
              const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
              const displaySize =
                realSizes[variantId] ??
                formatFileSize(
                  (useIosWhisperKit
                    ? getWhisperKitEstimatedDownloadMb(model.id)
                    : getWhisperEstimatedDownloadSizeMb(model.id, whisperModelWeightsFormat, {
                        coreMlAlreadyInstalled: coreMlEncoderActive[model.id] === true,
                      })) *
                    1024 *
                    1024,
                );

              return (
                <WhisperModelCard
                  key={model.id}
                  model={model}
                  index={index}
                  total={pickerModels.length}
                  status={status}
                  iosWhisperKitManaged={useIosWhisperKit}
                  embedded
                  isSelected={
                    useIosWhisperKit
                      ? selectedWhisperModel === model.id
                      : model.id === selectedWhisperModel &&
                        selectedWhisperModelFormat === whisperModelWeightsFormat
                  }
                  displaySize={displaySize}
                  recommendedModelId={recommendedModelId}
                  compatibility={
                    useIosWhisperKit ? null : compatibility ? compatibility[model.id] : null
                  }
                  color={color}
                  onPress={handleSelect}
                  onDelete={handleDelete}
                  onCancelDownload={cancelDownload}
                  downloadPercent={whisperDownloadProgress[variantId]}
                  downloadBytes={whisperDownloadBytes[variantId]}
                  downloadPhase={whisperDownloadPhase[variantId]}
                  coreMlEncoderActive={coreMlEncoderActive[model.id] === true}
                />
              );
            })}
          </SettingsSection>

          {useIosWhisperKit ? (
            <Text className="-mt-4 mb-7 px-1 text-xs leading-4" style={{ color: color.text.muted }}>
              {t('whisper.iosModelQualityHint')}
            </Text>
          ) : null}

          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
