import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Check, Download, Trash2 } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  LocalAiModelCatalogEntry,
  LocalAiModelId,
  UserSelectableAIModelId,
} from '@/entities/settings';
import {
  LOCAL_AI_MODELS,
  RECOMMENDED_AI_MODEL_ID,
  USER_FACING_AI_MODELS,
  useSettingsStore,
} from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useModelManager } from '@/features/model-manager';
import { useColors } from '@/shared/config';
import { useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader } from '@/shared/ui';

const SPEED_COLOR: Record<string, string> = {
  fast: '#10b981',
  medium: '#f59e0b',
  slow: '#ef4444',
};

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
  const localLlmModelStatuses = useSettingsStore((s) => s.localLlmModelStatuses);
  const localLlmDownloadProgress = useSettingsStore((s) => s.localLlmDownloadProgress);
  const localLlmDownloadBytes = useSettingsStore((s) => s.localLlmDownloadBytes);

  const {
    startLocalLlmDownload,
    cancelLocalLlmDownload,
    removeLocalLlmModel,
    syncLocalLlmDownloadedStatuses,
  } = useModelManager();

  useFocusEffect(
    useCallback(() => {
      void syncLocalLlmDownloadedStatuses();
    }, [syncLocalLlmDownloadedStatuses]),
  );

  const handleSelect = (id: UserSelectableAIModelId) => {
    setAIModel(id);
    navigation.goBack();
  };

  const handleSelectLocal = (id: LocalAiModelId) => {
    setLocalAiModel(id);
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

  const handleDeleteLocal = (id: LocalAiModelId, name: string) => {
    Alert.alert(t('aiModels.deleteLocalTitle'), t('aiModels.deleteLocalMessage', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => void removeLocalLlmModel(id),
      },
    ]);
  };

  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const models = isPrivateMode ? LOCAL_AI_MODELS : USER_FACING_AI_MODELS;

  const hasActiveLocalLlmDownload = Object.values(localLlmModelStatuses).some(
    (status) => status === 'downloading',
  );

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
          <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
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
                const isSelected = lm.id === selectedLocalAiModel;
                const isDownloaded = status === 'downloaded';
                const isDownloading = status === 'downloading';
                const isError = status === 'error';
                const pct = localLlmDownloadProgress[lm.id] ?? 0;
                const bytes = localLlmDownloadBytes[lm.id];

                return (
                  <View
                    key={lm.id}
                    className={`px-4 py-4 ${radiusClass}`}
                    style={[{ backgroundColor: color.background.card }, borderStyle]}
                  >
                    <TouchableOpacity
                      onPress={() => handleSelectLocal(lm.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={lm.name}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          <View className="mb-1 flex-row flex-wrap items-center gap-2">
                            <Text
                              className="text-[16px] font-semibold"
                              style={{ color: color.text.primary }}
                            >
                              {lm.name}
                            </Text>
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{ backgroundColor: color.status.processing.bg }}
                            >
                              <Text
                                className="text-[12px] font-medium"
                                style={{ color: color.status.processing.text }}
                              >
                                {t('aiModels.privateModeLabel')}
                              </Text>
                            </View>
                          </View>
                          <Text
                            className="text-[13px] leading-5 mb-1"
                            style={{ color: color.text.muted }}
                          >
                            {lm.provider} · {formatApproxSizeMb(lm.sizeMb)}
                          </Text>
                          <Text
                            className="text-[14px] leading-5 mb-1.5"
                            style={{ color: color.text.secondary }}
                          >
                            {t(lm.descriptionKey as 'aiModels.localQwen3Desc')}
                          </Text>
                          <View className="flex-row items-center gap-3">
                            <View className="flex-row items-center gap-1">
                              <View
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: SPEED_COLOR[lm.speed] }}
                              />
                              <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                                {t(`aiModels.speed.${lm.speed}`, { defaultValue: lm.speed })}
                              </Text>
                            </View>
                          </View>
                          {isDownloading ? (
                            <View className="mt-2">
                              <Text
                                className="text-[13px] mb-1"
                                style={{ color: color.text.secondary }}
                              >
                                {t('aiModels.downloadingPercent', { percent: Math.round(pct) })}
                              </Text>
                              {bytes && bytes.total > 0 ? (
                                <Text className="text-[12px]" style={{ color: color.text.muted }}>
                                  {Math.round(bytes.written / 1024 / 1024)} /{' '}
                                  {Math.round(bytes.total / 1024 / 1024)} MB
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                          {isError ? (
                            <Text
                              className="text-[13px] mt-2"
                              style={{ color: color.status.error.text }}
                            >
                              {t('aiModels.localDownloadError')}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <View
                            className="h-6 w-6 rounded-full items-center justify-center"
                            style={{ backgroundColor: color.accent.primary }}
                          >
                            <Check size={14} color="#ffffff" strokeWidth={2.5} />
                          </View>
                        ) : (
                          <View
                            className="h-6 w-6 rounded-full"
                            style={{ borderWidth: 2, borderColor: color.border.default }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {isDownloading ? (
                        <TouchableOpacity
                          className="flex-row items-center gap-2 rounded-xl px-3 py-2"
                          style={{ backgroundColor: color.background.secondary }}
                          onPress={() => void cancelLocalLlmDownload(lm.id)}
                        >
                          <Text style={{ color: color.text.primary }}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                      ) : !isDownloaded ? (
                        <TouchableOpacity
                          className="flex-row items-center gap-2 rounded-xl px-3 py-2"
                          style={{
                            backgroundColor: color.accent.primary,
                            opacity: hasActiveLocalLlmDownload ? 0.5 : 1,
                          }}
                          disabled={hasActiveLocalLlmDownload}
                          onPress={() => handleDownloadLocal(lm.id, lm.sizeMb)}
                        >
                          {hasActiveLocalLlmDownload ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Download size={18} color="#ffffff" />
                          )}
                          <Text className="font-medium" style={{ color: '#ffffff' }}>
                            {t('common.download')}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          className="flex-row items-center gap-2 rounded-xl px-3 py-2"
                          style={{ backgroundColor: color.background.secondary }}
                          onPress={() => handleDeleteLocal(lm.id, lm.name)}
                        >
                          <Trash2 size={18} color={color.status.error.text} />
                          <Text style={{ color: color.status.error.text }}>
                            {t('common.remove')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
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
                    <View className="flex-1 mr-3">
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
                        className="text-[13px] leading-5 mb-1"
                        style={{ color: color.text.muted }}
                      >
                        {model.name}
                      </Text>
                      <Text
                        className="text-[14px] leading-5 mb-1.5"
                        style={{ color: color.text.secondary }}
                      >
                        {t(model.descriptionKey as 'aiModels.geminiDesc')}
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <View
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: SPEED_COLOR[speed] }}
                          />
                          <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                            {t(`aiModels.speed.${speed}`, { defaultValue: speed })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isSelected ? (
                      <View
                        className="h-6 w-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: color.accent.primary }}
                      >
                        <Check size={14} color="#ffffff" strokeWidth={2.5} />
                      </View>
                    ) : (
                      <View
                        className="h-6 w-6 rounded-full"
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
