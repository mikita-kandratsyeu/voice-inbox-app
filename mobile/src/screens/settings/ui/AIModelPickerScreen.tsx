import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AIModelId } from '@/entities/settings';
import { AI_MODELS, getRecommendedAIModelId, useSettingsStore } from '@/entities/settings';
import { InboxBannerAd } from '@/features/inbox-banner';
import { getColors, useAppTheme } from '@/shared/config';
import { useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader } from '@/shared/ui';

const SPEED_COLOR: Record<string, string> = {
  fast: '#10b981',
  medium: '#f59e0b',
  slow: '#ef4444',
};

const PROVIDER_COLOR: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#c96442',
  Google: '#4285f4',
};

export const AIModelPickerScreen = () => {
  const { t } = useTranslation();
  const color = getColors(useAppTheme());
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const recommendedAIModelId = getRecommendedAIModelId();

  const handleSelect = (id: AIModelId) => {
    setAIModel(id);
    navigation.goBack();
  };

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
            {t('aiModels.description')}
          </Text>

          <View className="overflow-hidden rounded-2xl">
            {AI_MODELS.map((model, index) => {
              const isSelected = model.id === selectedAIModel;
              const isFirst = index === 0;
              const isLast = index === AI_MODELS.length - 1;
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

              return (
                <TouchableOpacity
                  key={model.id}
                  onPress={() => handleSelect(model.id)}
                  activeOpacity={0.7}
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
                          {model.name}
                        </Text>
                        {model.id === recommendedAIModelId && (
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
                        )}
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: (PROVIDER_COLOR[model.provider] ?? '#6b7280') + '20',
                          }}
                        >
                          <Text
                            className="text-[12px] font-medium"
                            style={{ color: PROVIDER_COLOR[model.provider] ?? '#6b7280' }}
                          >
                            {model.provider}
                          </Text>
                        </View>
                      </View>
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
                            style={{ backgroundColor: SPEED_COLOR[model.speed] }}
                          />
                          <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                            {t(`aiModels.speed.${model.speed}`, { defaultValue: model.speed })}
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
          <InboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
