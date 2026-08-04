import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Crown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import type { SettingsStackParamList } from '@/app/navigation/types';
import type {
  LocalAiModelCatalogEntry,
  LocalAiModelId,
  UserSelectableAIModelId,
} from '@/entities/settings';
import {
  buildAutoModelMetaChips,
  buildCloudModelMetaChips,
  DEFAULT_LOCAL_AI_MODEL_ID,
  getAllLocalAiModelEntries,
  getCloudModelsForPicker,
  isProOnlyAiModel,
  resolveLocalAiModelEntry,
  useSettingsStore,
} from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { getLocalLlmModelFileSizeBytes, useModelManager } from '@/features/model-manager';
import { useProEntitlement } from '@/features/pro-license';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { formatFileSize } from '@/shared/lib/whisper';
import { ScreenHeader } from '@/shared/ui';

import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';
import { HfGgufSearchSection } from './HfGgufSearchSection';
import { LocalAiModelCard } from './LocalAiModelCard';
import { ModelMetaChips } from './ModelMetaChips';

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
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { isProActive } = useProEntitlement();
  const [premiumModelSheet, setPremiumModelSheet] = useState(false);
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const setAiModelRoutingMode = useSettingsStore((s) => s.setAiModelRoutingMode);
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
        if (status !== 'downloaded' && status !== 'downloading') {
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
      getAllLocalAiModelEntries().map(async (m) => {
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

  const handleSelectManual = (id: UserSelectableAIModelId) => {
    if (!isProActive && isProOnlyAiModel(id)) {
      setPremiumModelSheet(true);
      return;
    }
    setAiModelRoutingMode('manual');
    setAIModel(id);
    navigation.goBack();
  };

  const handleSelectAuto = () => {
    setAiModelRoutingMode('auto');
    navigation.goBack();
  };

  const handleDownloadLocal = (id: LocalAiModelId, sizeMb: number) => {
    const sizeLabel = sizeMb > 0 ? String(sizeMb) : t('aiModels.hfSearchUnknownSize').toLowerCase();
    Alert.alert(
      t('aiModels.downloadLocalTitle'),
      t('aiModels.downloadLocalMessage', { size: sizeLabel }),
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
    const entry = resolveLocalAiModelEntry(id);
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
    const lm = resolveLocalAiModelEntry(id);
    if (!lm) return;
    const status = localLlmModelStatuses[id] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status !== 'downloaded') {
      if (hasActiveLocalLlmDownload) {
        Alert.alert(
          t('aiModels.localDownloadBlockedTitle'),
          t('aiModels.localDownloadBlockedBody'),
        );
        return;
      }
      handleDownloadLocal(id, lm.sizeMb);
      return;
    }
    setLocalAiModel(id);
    navigation.goBack();
  };

  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const cloudOptions = [
    {
      id: 'auto',
      tierLabel: t('aiModels.tierAuto'),
      name: t('aiModels.autoName'),
      description: t('aiModels.autoDescription'),
      isRecommended: true,
      metaChips: buildAutoModelMetaChips(t),
    },
    ...getCloudModelsForPicker(selectedAIModel).map((model) => ({
      id: model.id,
      tierLabel: t(model.tierLabelKey),
      name: model.name,
      description: t(model.descriptionKey as 'aiModels.geminiDesc'),
      speed: model.speed,
      isRecommended: false,
      metaChips: buildCloudModelMetaChips(model, t),
    })),
  ];
  const models = isPrivateMode ? getAllLocalAiModelEntries() : cloudOptions;
  const autoOption = cloudOptions[0];
  const manualCloudOptions = cloudOptions.slice(1);
  const standardCloudOptions = manualCloudOptions.filter(
    (option) => !isProOnlyAiModel(option.id as UserSelectableAIModelId),
  );
  const advancedCloudOptions = manualCloudOptions.filter((option) =>
    isProOnlyAiModel(option.id as UserSelectableAIModelId),
  );
  const smartModelSections = [
    {
      key: 'recommended',
      title: t('aiModels.recommendedSectionTitle'),
      description: t('aiModels.recommendedSectionDescription'),
      showsProBadge: false,
      options: [autoOption],
    },
    {
      key: 'standard',
      title: t('aiModels.standardSectionTitle'),
      description: t('aiModels.standardSectionDescription'),
      showsProBadge: false,
      options: standardCloudOptions,
    },
    {
      key: 'advanced',
      title: t('aiModels.advancedSectionTitle'),
      description: t('aiModels.advancedSectionDescription'),
      showsProBadge: !isProActive,
      options: advancedCloudOptions,
    },
  ].filter((section) => section.options.length > 0);

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
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={16}
        >
          {isPrivateMode ? (
            <View className="mb-3">
              <Text className="text-[14px] leading-5" style={{ color: color.text.secondary }}>
                {t('aiModels.privateDescription')}
              </Text>
              <Text className="mt-1.5 text-[13px] leading-5" style={{ color: color.text.muted }}>
                {t('aiModels.privateBudgetHint')}
              </Text>
            </View>
          ) : null}
          {isPrivateMode ? (
            <HfGgufSearchSection
              color={color}
              hasActiveDownload={hasActiveLocalLlmDownload}
              localLlmModelStatuses={localLlmModelStatuses}
              localLlmDownloadProgress={localLlmDownloadProgress}
              localLlmDownloadBytes={localLlmDownloadBytes}
              onInstall={handleDownloadLocal}
              onSelect={(id) => {
                setLocalAiModel(id);
                navigation.goBack();
              }}
              onDelete={handleDeleteLocal}
              onCancelDownload={cancelLocalLlmDownload}
            />
          ) : null}
          {isPrivateMode ? (
            <View className="mb-1 px-1">
              <Text
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: color.text.secondary }}
              >
                {t('aiModels.localModelsSectionTitle')}
              </Text>
            </View>
          ) : null}
          {isPrivateMode ? (
            <View className="overflow-hidden rounded-2xl">
              {models.map((model, index) => {
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
              })}
            </View>
          ) : null}
          {!isPrivateMode ? (
            <>
              {smartModelSections.map((section) => (
                <View key={section.key} className="mb-7">
                  <View className="mb-2.5 px-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: color.text.secondary }}
                      >
                        {section.title}
                      </Text>
                      {section.showsProBadge ? (
                        <View className="flex-row items-center gap-1">
                          <Crown size={13} color={color.accent.primary} strokeWidth={2} />
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: color.accent.primary }}
                          >
                            {t('common.pro')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      className="mt-0.5 text-[13px] leading-5"
                      style={{ color: color.text.muted }}
                    >
                      {section.description}
                    </Text>
                  </View>
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: color.border.default }}
                  >
                    {section.options.map((cloudOption, index) => {
                      const isFirst = index === 0;
                      const isLast = index === section.options.length - 1;
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
                      const isSelected =
                        cloudOption.id === 'auto'
                          ? aiModelRoutingMode === 'auto'
                          : aiModelRoutingMode === 'manual' && cloudOption.id === selectedAIModel;
                      const locked =
                        cloudOption.id !== 'auto' &&
                        !isProActive &&
                        isProOnlyAiModel(cloudOption.id as UserSelectableAIModelId);

                      return (
                        <TouchableOpacity
                          key={cloudOption.id}
                          onPress={() => {
                            if (cloudOption.id === 'auto') {
                              handleSelectAuto();
                              return;
                            }
                            if (locked) {
                              setPremiumModelSheet(true);
                              return;
                            }
                            handleSelectManual(cloudOption.id as UserSelectableAIModelId);
                          }}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={cloudOption.name}
                          accessibilityState={{ selected: isSelected }}
                          accessibilityHint={locked ? t('aiModels.proModelTitle') : undefined}
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
                                  {cloudOption.tierLabel}
                                </Text>
                                {cloudOption.id === 'auto' ? (
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
                              {cloudOption.id === 'auto' ? null : (
                                <Text
                                  className="mb-1 text-[13px] leading-5"
                                  style={{ color: color.text.muted }}
                                >
                                  {cloudOption.name}
                                </Text>
                              )}
                              <Text
                                className="mb-2 text-[14px] leading-5"
                                style={{ color: color.text.secondary }}
                              >
                                {cloudOption.description}
                              </Text>
                              {'metaChips' in cloudOption && cloudOption.metaChips ? (
                                <ModelMetaChips color={color} chips={cloudOption.metaChips} />
                              ) : null}
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
                </View>
              ))}
            </>
          ) : null}
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </KeyboardAwareScrollView>
      </View>
      {premiumModelSheet ? (
        <AutomationComingSoonSheet
          visible
          feature="premiumAiModel"
          onUpgradePress={() => {
            setPremiumModelSheet(false);
            openPlanPaywall();
          }}
          onClose={() => setPremiumModelSheet(false)}
        />
      ) : null}
    </View>
  );
};
