import { Check } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useSettingsStackBack } from '@/app/navigation/useSettingsStackBack';
import type { AiExecutionMode } from '@/entities/settings';
import {
  canEnablePrivateMode,
  formatPrivateDiagnosticsFreeDiskGb,
  formatPrivateDiagnosticsRamGb,
  resolvePrivateAiCapabilityTier,
  syncPrivateCapabilityTier,
  useSettingsStore,
} from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useColors } from '@/shared/config';
import { getTranscriptCharLimit } from '@/shared/lib/ai-core/localProvider';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader } from '@/shared/ui';

const AI_EXECUTION_MODES: AiExecutionMode[] = ['smart_hybrid', 'private_experimental'];

export const PrivateAiModeScreen = () => {
  const handleBack = useSettingsStackBack();
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const setAiExecutionMode = useSettingsStore((s) => s.setAiExecutionMode);
  const privateCapabilityTier = useSettingsStore((s) => s.privateCapabilityTier);

  useEffect(() => {
    syncPrivateCapabilityTier();
  }, []);

  const { diagnostics } = useMemo(() => resolvePrivateAiCapabilityTier(), [privateCapabilityTier]);

  const privateAllowed = canEnablePrivateMode(privateCapabilityTier);
  const limitedCharLimit = getTranscriptCharLimit('limited');

  const unavailableDiagnosticsLine = useMemo(() => {
    const ram = formatPrivateDiagnosticsRamGb(diagnostics);
    const disk = formatPrivateDiagnosticsFreeDiskGb(diagnostics);
    if (ram && disk) {
      return t('privateAiMode.unavailableDiagnostics', {
        ram: `${ram} GB`,
        disk: `${disk} GB`,
      });
    }
    const parts = [
      ram ? `${ram} GB RAM` : null,
      disk ? `${disk} GB` : null,
    ].filter(Boolean);
    if (parts.length === 0) return null;
    return t('privateAiMode.unavailableDiagnosticsPartial', { details: parts.join(', ') });
  }, [diagnostics, t]);

  const handleSelectMode = (mode: AiExecutionMode) => {
    if (mode === 'private_experimental' && !privateAllowed) {
      return;
    }
    if (mode === 'private_experimental' && aiExecutionMode !== 'private_experimental') {
      Alert.alert(t('privateAiMode.enableAlertTitle'), t('privateAiMode.enableAlertMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('transcription.continue'),
          style: 'destructive',
          onPress: () => setAiExecutionMode(mode),
        },
      ]);
      return;
    }
    setAiExecutionMode(mode);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('privateAiMode.title')} onBack={handleBack} />
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
            {t('privateAiMode.description')}
          </Text>
          {!privateAllowed ? (
            <View
              className="mb-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: color.border.default,
                backgroundColor: color.background.tertiary,
              }}
            >
              <Text className="text-[14px] leading-5" style={{ color: color.text.primary }}>
                {t('privateAiMode.unavailableDeviceHint')}
              </Text>
              {unavailableDiagnosticsLine ? (
                <Text
                  className="mt-2 text-[13px] leading-5"
                  style={{ color: color.text.secondary }}
                >
                  {unavailableDiagnosticsLine}
                </Text>
              ) : null}
            </View>
          ) : null}
          {privateCapabilityTier === 'limited' ? (
            <View
              className="mb-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: color.border.default,
                backgroundColor: color.background.tertiary,
              }}
            >
              <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
                {t('privateAiMode.limitedBeforeAiHint', {
                  limit: limitedCharLimit.toLocaleString(),
                })}
              </Text>
            </View>
          ) : null}
          <View
            className="overflow-hidden rounded-2xl"
            style={{ backgroundColor: color.background.card }}
          >
            {AI_EXECUTION_MODES.map((mode, index) => {
              const isSelected = aiExecutionMode === mode;
              const isLast = index === AI_EXECUTION_MODES.length - 1;
              const isPrivateOption = mode === 'private_experimental';
              const optionDisabled = isPrivateOption && !privateAllowed;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => handleSelectMode(mode)}
                  activeOpacity={optionDisabled ? 1 : 0.7}
                  disabled={optionDisabled}
                  className="flex-row items-center justify-between px-4 py-3.5"
                  style={{
                    opacity: optionDisabled ? 0.45 : 1,
                    ...(!isLast
                      ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                      : {}),
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(`aiSettings.executionMode.${mode}`)}
                  accessibilityState={{ selected: isSelected, disabled: optionDisabled }}
                >
                  <View className="min-w-0 flex-1 pr-3">
                    <Text className="text-[16px]" style={{ color: color.text.primary }}>
                      {t(`aiSettings.executionMode.${mode}`)}
                    </Text>
                    {optionDisabled ? (
                      <Text
                        className="mt-0.5 text-[12px] leading-4"
                        style={{ color: color.text.muted }}
                      >
                        {t('privateAiMode.unavailableOptionHint')}
                      </Text>
                    ) : null}
                  </View>
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
