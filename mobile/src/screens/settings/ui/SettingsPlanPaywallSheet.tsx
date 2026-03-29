import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { TFunction } from 'i18next';
import { Check, Crown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FREE_MAX_RECORDING_MS, type MonetizationMode } from '@/features/app-storefront';
import type {
  IapBillingOptions,
  IapBillingPeriod,
  IapIntroFreePeriod,
} from '@/features/entitlements';
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
  iapBilling?: IapBillingOptions;
  selectedIapPeriod?: IapBillingPeriod;
  onIapBillingPeriodChange?: (period: IapBillingPeriod) => void;
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

const EMPTY_IAP_BILLING: IapBillingOptions = {
  monthly: null,
  annual: null,
  savePercentVsMonthly: null,
};

type ThemeColors = ReturnType<typeof useColors>;

function introCaptionForFreeTrial(intro: IapIntroFreePeriod | null, t: TFunction): string | null {
  if (!intro) {
    return null;
  }
  const keyByUnit: Record<IapIntroFreePeriod['unit'], string> = {
    DAY: 'settings.planPaywall.trialDaysFree',
    WEEK: 'settings.planPaywall.trialWeeksFree',
    MONTH: 'settings.planPaywall.trialMonthsFree',
    YEAR: 'settings.planPaywall.trialYearsFree',
  };
  return t(keyByUnit[intro.unit], { count: intro.count });
}

type PlanPickTileProps = {
  c: ThemeColors;
  t: TFunction;
  title: string;
  intro: IapIntroFreePeriod | null;
  priceMainLine: string;
  priceSubLine: string | null;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
  saveBadgePercent: number | null;
};

function PlanPickTile({
  c,
  t,
  title,
  intro,
  priceMainLine,
  priceSubLine,
  selected,
  onPress,
  disabled,
  saveBadgePercent,
}: PlanPickTileProps) {
  const introText = introCaptionForFreeTrial(intro, t);
  const showBadge = saveBadgePercent != null && saveBadgePercent > 0;

  return (
    <View className="min-w-0 flex-1" style={{ position: 'relative', alignSelf: 'stretch' }}>
      {showBadge ? (
        <View
          className="items-center"
          style={{ position: 'absolute', left: 0, right: 0, top: -12, zIndex: 2 }}
          pointerEvents="none"
        >
          <View
            className="px-2.5 py-1"
            style={{
              borderRadius: 999,
              backgroundColor: c.accent.primary,
              maxWidth: '96%',
            }}
          >
            <Text
              className="text-[9px] font-bold uppercase"
              style={{
                color: '#FFFFFF',
                letterSpacing: 0.35,
                textAlign: 'center',
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t('settings.planPaywall.savePercentDiscountPill', { percent: saveBadgePercent })}
            </Text>
          </View>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        disabled={disabled}
        onPress={onPress}
        className="rounded-2xl px-3 pb-3 pt-3.5"
        style={{
          flex: 1,
          alignSelf: 'stretch',
          minHeight: 92,
          justifyContent: 'flex-start',
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? c.accent.primary : c.border.default,
          backgroundColor: selected ? `${c.accent.primary}14` : c.background.primary,
        }}
      >
        {selected ? (
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: c.accent.primary,
            }}
          >
            <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
          </View>
        ) : null}
        <View className="min-w-0 pr-7">
          <Text
            className="text-[15px] font-bold leading-5"
            style={{
              color: c.text.primary,
              ...(IS_ANDROID ? { includeFontPadding: false } : {}),
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="mt-2 text-[16px] font-bold leading-[18px]"
            style={{
              color: c.text.primary,
              ...(IS_ANDROID ? { includeFontPadding: false } : {}),
            }}
            numberOfLines={2}
          >
            {priceMainLine}
          </Text>
          {priceSubLine ? (
            <Text
              className="mt-0.5 text-[12px] leading-[15px]"
              style={{
                color: c.text.muted,
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
              numberOfLines={2}
            >
              {priceSubLine}
            </Text>
          ) : null}
          {introText ? (
            <Text
              className="mt-1 text-[11px] leading-[14px]"
              style={{
                color: c.text.secondary,
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
              numberOfLines={2}
            >
              {introText}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

export function SettingsPlanPaywallSheet({
  visible,
  mode,
  freeAiLimit,
  proAiLimit,
  onClose,
  onUpgradePress,
  onRestorePurchasesPress,
  iapBusy = false,
  iapBilling = EMPTY_IAP_BILLING,
  selectedIapPeriod = 'annual',
  onIapBillingPeriodChange,
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
  const iapMonthlyRow = iapBilling.monthly;
  const iapAnnualRow = iapBilling.annual;
  const iapSavePercent = iapBilling.savePercentVsMonthly;
  const iapDualBilling = Boolean(iapMonthlyRow && iapAnnualRow);
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
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: `${c.accent.primary}22` }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: c.accent.primary }}>
                {t('settings.planPaywall.proTitle').toUpperCase()}
              </Text>
            </View>
          </View>
          <View className="gap-y-2.5">
            <FeatureRow text={t('settings.planPaywall.features.autoTranscription')} emphasized />
            <FeatureRow text={t('settings.planPaywall.features.autoSummaryAndTasks')} emphasized />
            <FeatureRow text={t('settings.planPaywall.features.autoArchiveReadNotes')} emphasized />
            <FeatureRow text={t('settings.planPaywall.features.recordingUpTo30Min')} />
            <FeatureRow text={t('settings.planPaywall.features.aiLimit', { limit: proAiLimit })} />
            <FeatureRow text={t('settings.planPaywall.features.noAds')} />
          </View>
          {isIapPublic && !iapProPriceLoading && iapDualBilling && onIapBillingPeriodChange ? (
            <View
              className="mt-4 flex-row gap-2"
              style={{
                alignItems: 'stretch',
                paddingTop: iapSavePercent != null && iapSavePercent > 0 ? 10 : 0,
              }}
            >
              {iapMonthlyRow ? (
                <PlanPickTile
                  c={c}
                  t={t}
                  title={t('settings.planPaywall.billingMonthly')}
                  intro={iapMonthlyRow.introFree}
                  priceMainLine={`${iapMonthlyRow.priceString}${t('settings.planPaywall.billingSlashMonth')}`}
                  priceSubLine={null}
                  selected={selectedIapPeriod === 'monthly'}
                  onPress={() => onIapBillingPeriodChange('monthly')}
                  disabled={iapBusy}
                  saveBadgePercent={null}
                />
              ) : null}
              {iapAnnualRow ? (
                <PlanPickTile
                  c={c}
                  t={t}
                  title={t('settings.planPaywall.billingAnnual')}
                  intro={iapAnnualRow.introFree}
                  priceMainLine={
                    iapAnnualRow.pricePerMonthString
                      ? `${iapAnnualRow.pricePerMonthString}${t('settings.planPaywall.billingSlashMonth')}`
                      : `${iapAnnualRow.priceString}${t('settings.planPaywall.billingSlashYear')}`
                  }
                  priceSubLine={
                    iapAnnualRow.pricePerMonthString
                      ? `${iapAnnualRow.priceString}${t('settings.planPaywall.billingSlashYear')}`
                      : null
                  }
                  selected={selectedIapPeriod === 'annual'}
                  onPress={() => onIapBillingPeriodChange('annual')}
                  disabled={iapBusy}
                  saveBadgePercent={iapSavePercent}
                />
              ) : null}
            </View>
          ) : null}
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
