import { useNavigation } from '@react-navigation/native';
import { SlidersHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import {
  getWhisperEstimatedDownloadSizeMb,
  getWhisperModelVariantId,
  useRecommendedWhisperModelId,
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
  type WhisperModelId,
  type WhisperModelVariantId,
} from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { getWhisperVariantDisplaySizeBytes, isWhisperModelSelectable, useModelManager } from '@/features/model-manager';
import { IOS_WHISPERKIT_ROLLOUT_ENABLED } from '@/features/transcription/config/transcriptionEngine';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { IS_IOS } from '@/shared/lib/platform';
import { formatFileSize, isWhisperCoreMlEncoderInstalled } from '@/shared/lib/whisper';
import { ScreenHeader } from '@/shared/ui';

import { WhisperDefaultLanguageSection } from './WhisperDefaultLanguageSection';
import { WhisperIosEngineSection } from './WhisperIosEngineSection';
import { WhisperIosModelQualitySection } from './WhisperIosModelQualitySection';
import { WhisperQualityModeSection } from './WhisperQualityModeSection';
import { WhisperModelCard } from './WhisperModelCard';

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
  const setWhisperModelWeightsFormat = useSettingsStore((s) => s.setWhisperModelWeightsFormat);

  const compatibility = useWhisperModelCompatibility();
  const recommendedModelId = useRecommendedWhisperModelId();
  const { startDownload, cancelDownload, removeModel } = useModelManager();
  const useIosWhisperKit = IS_IOS && IOS_WHISPERKIT_ROLLOUT_ENABLED && iosWhisperKitEngineEnabled;

  const [realSizes, setRealSizes] = useState<Partial<Record<WhisperModelVariantId, string>>>({});
  const [coreMlEncoderActive, setCoreMlEncoderActive] = useState<
    Partial<Record<WhisperModelId, boolean>>
  >({});
  const refreshRequestIdRef = useRef(0);
  const coreMlRequestIdRef = useRef(0);
  const hasActiveWhisperDownload = Object.values(whisperModelStatuses).some(
    (status) => status === 'downloading',
  );

  const refreshRealSizes = useCallback(async () => {
    const requestId = ++refreshRequestIdRef.current;
    const entries = await Promise.all(
      WHISPER_MODELS.map(async (m) => {
        const variantId = getWhisperModelVariantId(m.id, whisperModelWeightsFormat);
        const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
        const downloaded = status === 'downloaded';
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
  }, [whisperModelStatuses, whisperModelWeightsFormat]);

  const refreshCoreMlEncoderPresence = useCallback(async () => {
    if (!IS_IOS) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whisperModelStatuses, whisperModelWeightsFormat]);

  useEffect(() => {
    refreshRealSizes();
  }, [refreshRealSizes]);

  useEffect(() => {
    void refreshCoreMlEncoderPresence();
  }, [refreshCoreMlEncoderPresence]);

  const handleDownload = async (id: WhisperModelId) => {
    const coreMlInstalled = IS_IOS ? coreMlEncoderActive[id] === true : false;
    const sizeMb = getWhisperEstimatedDownloadSizeMb(id, whisperModelWeightsFormat, {
      coreMlAlreadyInstalled: coreMlInstalled,
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
    Alert.alert(
      t('whisper.deleteModel'),
      t('whisper.deleteConfirmWithName', { name: model?.name ?? '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            await removeModel(id);
            await refreshRealSizes();
            await refreshCoreMlEncoderPresence();
          },
        },
      ],
    );
  };

  const handleSelect = (id: WhisperModelId) => {
    const variantId = getWhisperModelVariantId(id, whisperModelWeightsFormat);
    const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (!isWhisperModelSelectable(status, useIosWhisperKit)) {
      const model = WHISPER_MODELS.find((m) => m.id === id);
      if (model) void handleDownload(id);
      return;
    }
    setWhisperModel(id);
    navigation.goBack();
  };

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
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {useIosWhisperKit ? t('whisper.modelDescriptionIos') : t('whisper.modelDescription')}
          </Text>
          <WhisperQualityModeSection color={color} />
          <WhisperIosEngineSection color={color} />
          <WhisperDefaultLanguageSection color={color} />
          {useIosWhisperKit ? (
            <WhisperIosModelQualitySection color={color} />
          ) : (
          <View
            className="mb-6 gap-2 rounded-2xl p-4"
            style={{ backgroundColor: color.background.card }}
          >
            <View className="flex-row items-center gap-2">
              <SlidersHorizontal size={18} color={color.icon.muted} strokeWidth={2} />
              <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
                {t('whisper.weightsFormatTitle')}
              </Text>
            </View>
            <View
              className="flex-row rounded-xl p-1"
              style={{ backgroundColor: color.background.tertiary }}
            >
              {(['q5_1', 'full'] as const).map((format) => {
                const selected = whisperModelWeightsFormat === format;

                return (
                  <TouchableOpacity
                    key={format}
                    onPress={() => {
                      if (selected) {
                        return;
                      }

                      if (hasActiveWhisperDownload) {
                        Alert.alert(
                          t('whisper.weightsFormatChangeBlockedTitle'),
                          t('whisper.weightsFormatChangeBlockedBody'),
                        );
                        return;
                      }

                      setWhisperModelWeightsFormat(format);
                    }}
                    activeOpacity={0.8}
                    className="flex-1 items-center justify-center rounded-lg px-3 py-3"
                    style={{
                      minHeight: 44,
                      backgroundColor: selected ? color.background.card : 'transparent',
                      borderWidth: selected ? 1 : 0,
                      borderColor: selected ? color.accent.primary : 'transparent',
                      opacity: hasActiveWhisperDownload && !selected ? 0.6 : 1,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      format === 'q5_1'
                        ? t('whisper.weightsFormatQ5')
                        : t('whisper.weightsFormatFull')
                    }
                    accessibilityState={{
                      selected,
                    }}
                  >
                    <Text
                      className="text-center text-[16px] font-medium"
                      style={{ color: selected ? color.accent.primary : color.text.secondary }}
                    >
                      {format === 'q5_1'
                        ? t('whisper.weightsFormatQ5')
                        : t('whisper.weightsFormatFull')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-xs" style={{ color: color.text.muted }}>
              {whisperModelWeightsFormat === 'q5_1'
                ? t('whisper.weightsFormatQ5Hint')
                : t('whisper.weightsFormatFullHint')}
            </Text>
          </View>
          )}
          {!useIosWhisperKit ? (
          <View className="overflow-hidden rounded-2xl">
            {WHISPER_MODELS.map((model, index) => {
              const variantId = getWhisperModelVariantId(model.id, whisperModelWeightsFormat);
              const status = whisperModelStatuses[variantId] ?? 'not_downloaded';
              const iosWhisperKitManaged = useIosWhisperKit && status !== 'downloaded';
              const displaySize =
                realSizes[variantId] ??
                formatFileSize(
                  getWhisperEstimatedDownloadSizeMb(model.id, whisperModelWeightsFormat, {
                    coreMlAlreadyInstalled: coreMlEncoderActive[model.id] === true,
                  }) *
                    1024 *
                    1024,
                );

              if (whisperModelWeightsFormat === 'q5_1' && model.id === 'whisper-medium') {
                return null;
              }

              return (
                <WhisperModelCard
                  key={model.id}
                  model={model}
                  index={index}
                  total={WHISPER_MODELS.length}
                  status={status}
                  iosWhisperKitManaged={iosWhisperKitManaged}
                  isSelected={
                    model.id === selectedWhisperModel &&
                    selectedWhisperModelFormat === whisperModelWeightsFormat
                  }
                  displaySize={displaySize}
                  recommendedModelId={recommendedModelId}
                  compatibility={compatibility ? compatibility[model.id] : null}
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
          </View>
          ) : null}
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
