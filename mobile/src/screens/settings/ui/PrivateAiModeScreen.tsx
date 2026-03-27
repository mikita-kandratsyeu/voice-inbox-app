import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AiExecutionMode } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useColors } from '@/shared/config';
import { useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader } from '@/shared/ui';

const AI_EXECUTION_MODES: AiExecutionMode[] = ['smart_hybrid', 'private_experimental'];

export const PrivateAiModeScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const setAiExecutionMode = useSettingsStore((s) => s.setAiExecutionMode);
  const privateCapabilityTier = useSettingsStore((s) => s.privateCapabilityTier);

  const handleSelectMode = (mode: AiExecutionMode) => {
    if (mode === 'private_experimental' && privateCapabilityTier === 'unavailable') {
      return;
    }
    setAiExecutionMode(mode);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('privateAiMode.title')} onBack={() => navigation.goBack()} />
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
            {t('privateAiMode.description')}
          </Text>
          <View
            className="overflow-hidden rounded-2xl"
            style={{ backgroundColor: color.background.card }}
          >
            {AI_EXECUTION_MODES.map((mode, index) => {
              const isSelected = aiExecutionMode === mode;
              const isLast = index === AI_EXECUTION_MODES.length - 1;
              const isDisabled =
                mode === 'private_experimental' && privateCapabilityTier === 'unavailable';
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => handleSelectMode(mode)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between px-4 py-3.5"
                  style={{
                    opacity: isDisabled ? 0.55 : 1,
                    ...(!isLast
                      ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                      : {}),
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(`aiSettings.executionMode.${mode}`)}
                  accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                >
                  <Text className="text-[16px]" style={{ color: color.text.primary }}>
                    {t(`aiSettings.executionMode.${mode}`)}
                  </Text>
                  {isSelected ? (
                    <View
                      className="h-6 w-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: color.accent.primary }}
                    >
                      <Check size={14} color="#fff" strokeWidth={2.5} />
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
          <Text className="mt-2 px-1 text-[12px] leading-5" style={{ color: color.text.secondary }}>
            {t(`aiSettings.privateCapabilityTier.${privateCapabilityTier}`)}
          </Text>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
