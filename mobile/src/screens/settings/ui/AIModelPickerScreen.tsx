import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LocalAiModelId, UserSelectableAIModelId } from '@/entities/settings';
import {
  LOCAL_AI_MODELS,
  RECOMMENDED_AI_MODEL_ID,
  USER_FACING_AI_MODELS,
  useSettingsStore,
} from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useColors } from '@/shared/config';
import { useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader } from '@/shared/ui';

const SPEED_COLOR: Record<string, string> = {
  fast: '#10b981',
  medium: '#f59e0b',
  slow: '#ef4444',
};

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

  const handleSelect = (id: UserSelectableAIModelId) => {
    setAIModel(id);
    navigation.goBack();
  };

  const handleSelectLocal = (id: LocalAiModelId) => {
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
          <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {isPrivateMode ? t('aiModels.privateDescription') : t('aiModels.description')}
          </Text>

          <View className="overflow-hidden rounded-2xl">
            {models.map((model, index) => {
              const isSelected = isPrivateMode
                ? model.id === selectedLocalAiModel
                : model.id === selectedAIModel;
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
              const speed = model.speed;
              const tierLabel = !isPrivateMode
                ? t((model as { tierLabelKey: string }).tierLabelKey as 'aiModels.tierFast')
                : model.name;

              return (
                <TouchableOpacity
                  key={model.id}
                  onPress={() =>
                    isPrivateMode
                      ? handleSelectLocal(model.id as LocalAiModelId)
                      : handleSelect(model.id as UserSelectableAIModelId)
                  }
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
                        {!isPrivateMode && model.id === RECOMMENDED_AI_MODEL_ID ? (
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
                        {isPrivateMode ? (
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
