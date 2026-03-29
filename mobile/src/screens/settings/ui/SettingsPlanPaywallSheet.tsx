import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check, Crown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FREE_MAX_RECORDING_MS, type MonetizationMode } from '@/features/app-storefront';
import { useColors } from '@/shared/config';
import { IS_ANDROID, IS_IOS, modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

type SettingsPlanPaywallSheetProps = {
  visible: boolean;
  mode: MonetizationMode;
  freeAiLimit: number;
  proAiLimit: number;
  onClose: () => void;
  onUpgradePress?: () => void;
  onRestorePurchasesPress?: () => void;
  iapBusy?: boolean;
  iapProPriceLabel?: string | null;
  iapProPriceLoading?: boolean;
};

type FeatureRowProps = {
  text: string;
  emphasized?: boolean;
  mutedCheck?: boolean;
};

function FeatureRow({ text, emphasized, mutedCheck }: FeatureRowProps) {
  const c = useColors();
  const lineHeight = 20;

  return (
    <View className="flex-row items-start gap-2.5">
      <View
        className="h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: mutedCheck ? c.background.tertiary : '#7E5BFF22',
          marginTop: IS_IOS ? 1 : 0,
        }}
      >
        <Check size={13} color={mutedCheck ? c.text.muted : c.accent.primary} strokeWidth={2.4} />
      </View>
      <Text
        className={`flex-1 text-[14px] ${emphasized ? 'font-semibold' : ''}`}
        style={{
          color: c.text.primary,
          fontSize: 14,
          lineHeight,
          ...(IS_ANDROID ? { includeFontPadding: false } : {}),
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const FREE_MAX_MINUTES = Math.round(FREE_MAX_RECORDING_MS / 60_000);

export function SettingsPlanPaywallSheet({
  visible,
  mode,
  freeAiLimit,
  proAiLimit,
  onClose,
  onUpgradePress,
  onRestorePurchasesPress,
  iapBusy = false,
  iapProPriceLabel = null,
  iapProPriceLoading = false,
}: SettingsPlanPaywallSheetProps) {
  const { t } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const isComingSoon = mode === 'coming_soon';
  const isIapPublic = mode === 'iap_public';
  const upgradeDisabled = isComingSoon || iapBusy;
  const upgradeLabel = isComingSoon
    ? t('settings.planPaywall.comingSoon')
    : t('settings.planPaywall.upgrade');

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: c.background.primary,
        borderTopWidth: 1,
        borderTopColor: c.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: c.icon.muted,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 22),
        }}
      >
        <View className="mb-4 flex-row items-center">
          <View
            className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: c.background.tertiary }}
          >
            <Crown size={22} color={c.accent.primary} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Text className="text-[21px] font-bold leading-7" style={{ color: c.text.primary }}>
              {t('settings.planPaywall.title')}
            </Text>
            <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: c.text.secondary }}>
              {t('settings.planPaywall.subtitle')}
            </Text>
          </View>
        </View>

        <View
          className="mb-3 rounded-2xl border p-4"
          style={{ borderColor: c.border.default, backgroundColor: c.background.secondary }}
        >
          <Text className="text-sm font-semibold" style={{ color: c.text.primary }}>
            {t('settings.planPaywall.freeTitle')}
          </Text>
          <View className="mt-3 gap-y-2.5">
            <FeatureRow mutedCheck text={t('settings.planPaywall.freeLimits.manualAi')} />
            <FeatureRow
              mutedCheck
              text={t('settings.planPaywall.freeLimits.recording', { minutes: FREE_MAX_MINUTES })}
            />
            <FeatureRow
              mutedCheck
              text={t('settings.planPaywall.freeLimits.weeklyAi', { limit: freeAiLimit })}
            />
          </View>
        </View>

        <View
          className="mb-5 rounded-2xl border-2 p-5"
          style={{
            borderColor: `${c.accent.primary}99`,
            backgroundColor: c.background.secondary,
          }}
        >
          <View className="mb-3 flex-row items-center justify-between gap-2">
            <Text className="text-[15px] font-semibold" style={{ color: c.text.primary }}>
              {t('settings.planPaywall.proTitle')}
            </Text>
            {isIapPublic && iapProPriceLoading ? (
              <ActivityIndicator color={c.accent.primary} />
            ) : isIapPublic && iapProPriceLabel ? (
              <Text
                className="max-w-[58%] text-right text-[15px] font-semibold leading-5"
                style={{ color: c.accent.primary }}
                numberOfLines={2}
                accessibilityLabel={iapProPriceLabel}
              >
                {iapProPriceLabel}
              </Text>
            ) : (
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: `${c.accent.primary}22` }}
              >
                <Text className="text-[11px] font-semibold" style={{ color: c.accent.primary }}>
                  PRO
                </Text>
              </View>
            )}
          </View>
          <View className="gap-y-2.5">
            <FeatureRow text={t('settings.planPaywall.features.autoTranscription')} emphasized />
            <FeatureRow text={t('settings.planPaywall.features.autoSummaryAndTasks')} emphasized />
            <FeatureRow text={t('settings.planPaywall.features.autoArchiveReadNotes')} emphasized />
            <FeatureRow text={t('settings.planPaywall.features.recordingUpTo30Min')} />
            <FeatureRow text={t('settings.planPaywall.features.aiLimit', { limit: proAiLimit })} />
            <FeatureRow text={t('settings.planPaywall.features.noAds')} />
          </View>
        </View>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          label={upgradeLabel}
          loading={isIapPublic && iapBusy}
          onPress={onUpgradePress}
          disabled={upgradeDisabled}
          color={c}
          activeOpacity={0.85}
        />
        {isIapPublic && onRestorePurchasesPress ? (
          <Pressable
            className="mt-4 items-center justify-center py-2"
            onPress={iapBusy ? undefined : onRestorePurchasesPress}
            disabled={iapBusy}
            accessibilityRole="button"
            accessibilityLabel={t('settings.planPaywall.restorePurchases')}
          >
            <Text className="text-[15px] font-medium" style={{ color: c.accent.primary }}>
              {t('settings.planPaywall.restorePurchases')}
            </Text>
          </Pressable>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
