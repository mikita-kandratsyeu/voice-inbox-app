import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  LocalAiModelCatalogEntry,
  LocalAiModelId,
  UserSelectableAIModelId,
} from '@/entities/settings';
import {
  DEFAULT_LOCAL_AI_MODEL_ID,
  LOCAL_AI_MODELS,
  RECOMMENDED_AI_MODEL_ID,
  USER_FACING_AI_MODELS,
  useSettingsStore,
} from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { getLocalLlmModelFileSizeBytes, useModelManager } from '@/features/model-manager';
import { useColors } from '@/shared/config';
import { useTabletContentMaxWidth } from '@/shared/lib';
import { formatFileSize } from '@/shared/lib/whisper';
import { ScreenHeader } from '@/shared/ui';

import { getSpeedColor } from '../lib';
import { LocalAiModelCard } from './LocalAiModelCard';

function formatApproxSizeMb(sizeMb: number): string {
  if (sizeMb >= 1000) {
    return `~${(sizeMb / 1000).toFixed(1)} GB`;
  }
  return `~${sizeMb} MB`;
}

export const AIModelPickerScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);
  const setLocalAiModel = useSettingsStore((s) => s.setLocalAiModel);
  const clearLocalAiModelSelection = useSettingsStore((s) => s.clearLocalAiModelSelection);
  const localLlmModelStatuses = useSettingsStore((s) => s.localLlmModelStatuses);
  const localLlmDownloadProgress = useSettingsStore((s) => s.localLlmDownloadProgress);
  const localLlmDownloadBytes = useSettingsStore((s) => s.localLlmDownloadBytes);

  const {
    startLocalLlmDownload,
    cancelLocalLlmDownload,
    removeLocalLlmModel,
    syncLocalLlmDownloadedStatuses,
  } = useModelManager();

  const [realLocalSizes, setRealLocalSizes] = useState<Partial<Record<LocalAiModelId, string>>>({});
  const refreshLocalSizesRequestIdRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      void syncLocalLlmDownloadedStatuses();
      return () => {
        const { selectedLocalAiModel: storedId, localLlmModelStatuses } =
          useSettingsStore.getState();
        if (storedId == null) return;
        const status = localLlmModelStatuses[storedId] ?? 'not_downloaded';
        if (status !== 'downloaded') {
          clearLocalAiModelSelection();
        }
      };
    }, [clearLocalAiModelSelection, syncLocalLlmDownloadedStatuses]),
  );

  const hasActiveLocalLlmDownload = Object.values(localLlmModelStatuses).some(
    (status) => status === 'downloading',
  );

  const refreshRealLocalSizes = useCallback(async () => {
    const requestId = ++refreshLocalSizesRequestIdRef.current;
    const entries = await Promise.all(
      LOCAL_AI_MODELS.map(async (m) => {
        const status = localLlmModelStatuses[m.id] ?? 'not_downloaded';
        if (status !== 'downloaded') return [m.id, null] as const;
        const bytes = await getLocalLlmModelFileSizeBytes(m.id);
        if (bytes <= 0) return [m.id, null] as const;
        return [m.id, formatFileSize(bytes)] as const;
      }),
    );

    if (requestId !== refreshLocalSizesRequestIdRef.current) return;

    setRealLocalSizes((prev) => {
      const next = { ...prev };
      for (const [id, size] of entries) {
        if (size) next[id] = size;
        else delete next[id];
      }
      return next;
    });
  }, [localLlmModelStatuses]);

  useEffect(() => {
    void refreshRealLocalSizes();
  }, [refreshRealLocalSizes]);

  const handleSelect = (id: UserSelectableAIModelId) => {
    setAIModel(id);
    navigation.goBack();
  };

  const handleDownloadLocal = (id: LocalAiModelId, sizeMb: number) => {
    Alert.alert(
      t('aiModels.downloadLocalTitle'),
      t('aiModels.downloadLocalMessage', { size: sizeMb }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.download'),
          onPress: () => void startLocalLlmDownload(id),
        },
      ],
    );
  };

  const handleDeleteLocal = (id: LocalAiModelId) => {
    const entry = LOCAL_AI_MODELS.find((m) => m.id === id);
    const name = entry?.name ?? '';
    Alert.alert(t('aiModels.deleteLocalTitle'), t('aiModels.deleteLocalMessage', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          void removeLocalLlmModel(id).then(() => refreshRealLocalSizes());
        },
      },
    ]);
  };

  const handlePressLocalModel = (id: LocalAiModelId) => {
    const lm = LOCAL_AI_MODELS.find((m) => m.id === id);
    if (!lm) return;
    const status = localLlmModelStatuses[id] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status !== 'downloaded') {
      if (hasActiveLocalLlmDownload) return;
      handleDownloadLocal(id, lm.sizeMb);
      return;
    }
    setLocalAiModel(id);
    navigation.goBack();
  };

  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const models = isPrivateMode ? LOCAL_AI_MODELS : USER_FACING_AI_MODELS;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('aiModels.title')} onBack={() => navigation.goBack()} />
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
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            className={`text-[14px] leading-5 ${isPrivateMode ? 'mb-2' : 'mb-4'}`}
            style={{ color: color.text.secondary }}
          >
            {isPrivateMode ? t('aiModels.privateDescription') : t('aiModels.description')}
          </Text>
          <View className="overflow-hidden rounded-2xl">
            {models.map((model, index) => {
              const isFirst = index === 0;
              const isLast = index === models.length - 1;
              const borderStyle = !isLast
                ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                : {};
              const radiusClass =
                isFirst && isLast
                  ? 'rounded-2xl'
                  : isFirst
                    ? 'rounded-t-2xl'
                    : isLast
                      ? 'rounded-b-2xl'
                      : '';

              if (isPrivateMode) {
                const lm = model as LocalAiModelCatalogEntry;
                const status = localLlmModelStatuses[lm.id] ?? 'not_downloaded';
                const isSelected =
                  selectedLocalAiModel != null &&
                  lm.id === selectedLocalAiModel &&
                  status === 'downloaded';
                const displaySize = realLocalSizes[lm.id] ?? formatApproxSizeMb(lm.sizeMb);

                return (
                  <LocalAiModelCard
                    key={lm.id}
                    model={lm}
                    index={index}
                    total={models.length}
                    status={status}
                    isSelected={isSelected}
                    displaySize={displaySize}
                    approxSizeLabel={formatApproxSizeMb(lm.sizeMb)}
                    recommendedModelId={DEFAULT_LOCAL_AI_MODEL_ID}
                    color={color}
                    onPress={handlePressLocalModel}
                    onDelete={handleDeleteLocal}
                    onCancelDownload={cancelLocalLlmDownload}
                    downloadPercent={localLlmDownloadProgress[lm.id]}
                    downloadBytes={localLlmDownloadBytes[lm.id]}
                  />
                );
              }

              const isSelected = model.id === selectedAIModel;
              const speed = model.speed;
              const tierLabel = t(
                (model as { tierLabelKey: string }).tierLabelKey as 'aiModels.tierFast',
              );

              return (
                <TouchableOpacity
                  key={model.id}
                  onPress={() => handleSelect(model.id as UserSelectableAIModelId)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={model.name}
                  accessibilityState={{ selected: isSelected }}
                  className={`px-4 py-4 ${radiusClass}`}
                  style={[{ backgroundColor: color.background.card }, borderStyle]}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="mr-3 flex-1">
                      <View className="mb-1 flex-row flex-wrap items-center gap-2">
                        <Text
                          className="text-[16px] font-semibold"
                          style={{ color: color.text.primary }}
                        >
                          {tierLabel}
                        </Text>
                        {model.id === RECOMMENDED_AI_MODEL_ID ? (
                          <View
                            className="rounded-full px-2 py-0.5"
                            style={{ backgroundColor: color.status.processing.bg }}
                          >
                            <Text
                              className="text-[12px] font-medium"
                              style={{ color: color.status.processing.text }}
                            >
                              {t('whisper.recommended')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        className="mb-1 text-[13px] leading-5"
                        style={{ color: color.text.muted }}
                      >
                        {model.name}
                      </Text>
                      <Text
                        className="mb-1.5 text-[14px] leading-5"
                        style={{ color: color.text.secondary }}
                      >
                        {t(model.descriptionKey as 'aiModels.geminiDesc')}
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <View
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: getSpeedColor(speed, color) }}
                          />
                          <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                            {t(`aiModels.speed.${speed}`, { defaultValue: speed })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isSelected ? (
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: color.accent.primary }}
                      >
                        <Check size={16} color={color.icon.onAccent} strokeWidth={2.5} />
                      </View>
                    ) : (
                      <View
                        className="h-8 w-8 rounded-full"
                        style={{ borderWidth: 2, borderColor: color.border.default }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
