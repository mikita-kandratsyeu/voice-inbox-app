import type { TFunction } from 'i18next';
import { Check, ChevronDown, Crown, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FREE_MAX_RECORDING_MS, type MonetizationMode } from '@/features/app-storefront';
import type {
  IapBillingOptions,
  IapBillingPeriod,
  IapIntroFreePeriod,
} from '@/features/entitlements';
import { openInAppBrowser } from '@/features/in-app-browser';
import { getWebsiteUrl, useAppTheme, useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';
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

/** Wrapped lines use this height; ~`fontSize` + list `gap` so multi-line matches row spacing. */
const PLAN_PAYWALL_FEATURE_LINE_HEIGHT = 21;
const PLAN_PAYWALL_FEATURE_LIST_GAP = 8;

function FeatureRow({ text, emphasized, mutedCheck }: FeatureRowProps) {
  const c = useColors();
  const lineHeight = PLAN_PAYWALL_FEATURE_LINE_HEIGHT;
  const iconOffset = (lineHeight - 20) / 2;

  return (
    <View className="flex-row items-start">
      <View
        className="h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: mutedCheck ? c.background.tertiary : '#7E5BFF22',
          marginTop: iconOffset,
        }}
      >
        <Check size={12} color={mutedCheck ? c.text.muted : c.accent.primary} strokeWidth={2.4} />
      </View>
      <Text
        className={`flex-1 text-[13px] ${emphasized ? 'font-semibold' : ''}`}
        style={{
          marginLeft: 6,
          color: c.text.primary,
          fontSize: 13,
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
  annual: null,
  monthly: null,
  annualComparedToMonthlyYearPriceString: null,
  savePercentVsMonthly: null,
};

type ThemeColors = ReturnType<typeof useColors>;

function IapPlanOptionsSkeleton({ c }: { c: ThemeColors }) {
  const cardStyle = {
    height: 90,
    borderRadius: 16,
    backgroundColor: c.background.tertiary,
    opacity: IS_IOS ? 0.65 : 0.55,
  };

  return (
    <View
      className="mt-3 gap-2.5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={cardStyle} />
      <View style={cardStyle} />
    </View>
  );
}

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

type SubscriptionPlanOptionCardProps = {
  c: ThemeColors;
  t: TFunction;
  title: string;
  intro: IapIntroFreePeriod | null;
  billedHeadline: string;
  billedHeadlineCompareAt: string | null;
  subordinateLine: string | null;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
  saveBadgePercent: number | null;
};

function SubscriptionPlanOptionCard({
  c,
  t,
  title,
  intro,
  billedHeadline,
  billedHeadlineCompareAt,
  subordinateLine,
  selected,
  onPress,
  disabled,
  saveBadgePercent,
}: SubscriptionPlanOptionCardProps) {
  const introText = introCaptionForFreeTrial(intro, t);
  const showBadge = saveBadgePercent != null && saveBadgePercent > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      className="w-full rounded-2xl px-4 pb-2.5 pt-2.5"
      style={{
        alignSelf: 'stretch',
        borderWidth: 2,
        borderColor: selected ? c.accent.primary : c.border.default,
        backgroundColor: selected ? `${c.accent.primary}12` : c.background.primary,
      }}
    >
      {selected ? (
        <View
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 2,
            backgroundColor: c.accent.primary,
          }}
        >
          <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
        </View>
      ) : null}
      <View className="min-w-0 pr-10">
        <View className="min-w-0 flex-row flex-wrap items-center gap-2">
          <Text
            className="text-[15px] font-medium leading-5"
            style={{
              color: c.text.primary,
              ...(IS_ANDROID ? { includeFontPadding: false } : {}),
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {showBadge ? (
            <View
              className="px-2 py-0.5"
              style={{
                borderRadius: 999,
                backgroundColor: c.accent.primary,
                maxWidth: '100%',
              }}
            >
              <Text
                className="text-[10px] font-bold uppercase"
                style={{
                  color: '#FFFFFF',
                  letterSpacing: 0.4,
                  ...(IS_ANDROID ? { includeFontPadding: false } : {}),
                }}
                numberOfLines={1}
              >
                {t('settings.planPaywall.savePercentDiscountPill', { percent: saveBadgePercent })}
              </Text>
            </View>
          ) : null}
        </View>

        {billedHeadlineCompareAt ? (
          <View className="mt-1.5 flex-row flex-wrap items-baseline gap-x-2 gap-y-1">
            <Text
              className="text-[15px] font-semibold leading-[21px]"
              style={{
                color: c.text.muted,
                textDecorationLine: 'line-through',
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
              numberOfLines={2}
            >
              {billedHeadlineCompareAt}
            </Text>
            <Text
              className="text-[15px] font-semibold leading-[21px]"
              style={{
                color: c.text.primary,
                ...(IS_ANDROID ? { includeFontPadding: false } : {}),
              }}
              numberOfLines={2}
            >
              {billedHeadline}
            </Text>
          </View>
        ) : (
          <Text
            className="mt-1.5 text-[15px] font-semibold leading-[21px]"
            style={{
              color: c.text.primary,
              ...(IS_ANDROID ? { includeFontPadding: false } : {}),
            }}
            numberOfLines={2}
          >
            {billedHeadline}
          </Text>
        )}
        {subordinateLine ? (
          <Text
            className="mt-0.5 text-[12px] leading-[15px]"
            style={{
              color: c.text.muted,
              ...(IS_ANDROID ? { includeFontPadding: false } : {}),
            }}
            numberOfLines={2}
          >
            {subordinateLine}
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
  const browserColorScheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [freeLimitsExpanded, setFreeLimitsExpanded] = useState(false);
  const freeLimitsChevronRotation = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setFreeLimitsExpanded(false);
    }
  }, [visible]);

  useEffect(() => {
    freeLimitsChevronRotation.value = withTiming(freeLimitsExpanded ? 180 : 0, {
      duration: 120,
      easing: freeLimitsExpanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [freeLimitsChevronRotation, freeLimitsExpanded]);

  const freeLimitsChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${freeLimitsChevronRotation.value}deg` }],
  }));

  const isComingSoon = mode === 'coming_soon';
  const isIapPublic = mode === 'iap_public';
  const iapMonthlyRow = iapBilling.monthly;
  const iapAnnualRow = iapBilling.annual;
  const iapSavePercent = iapBilling.savePercentVsMonthly;
  const iapAnnualCompareAtYear =
    iapBilling.annualComparedToMonthlyYearPriceString != null &&
    iapBilling.annualComparedToMonthlyYearPriceString.length > 0
      ? `${iapBilling.annualComparedToMonthlyYearPriceString}${t('settings.planPaywall.billingSlashYear')}`
      : null;
  const iapDualBilling = Boolean(iapMonthlyRow && iapAnnualRow);
  const upgradeDisabled =
    isComingSoon ||
    iapBusy ||
    (isIapPublic && Boolean(onIapBillingPeriodChange) && iapProPriceLoading);
  const upgradeLabel = isComingSoon
    ? t('settings.planPaywall.comingSoon')
    : t('settings.planPaywall.upgrade');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      {...(IS_IOS ? ({ presentationStyle: 'fullScreen' } as const) : {})}
    >
      <View style={{ flex: 1, backgroundColor: c.background.primary }}>
        <View
          className="flex-row items-center justify-between gap-2 px-4 pb-2"
          style={{
            backgroundColor: c.background.primary,
            borderBottomWidth: 1,
            borderBottomColor: c.border.default,
            paddingTop: insets.top + 2,
          }}
        >
          <Button
            iconOnly
            variant="icon"
            size="md"
            icon={<X size={22} color={c.text.primary} strokeWidth={2.2} />}
            color={c}
            onPress={onClose}
            accessibilityLabel={t('common.close')}
          />
          {isIapPublic && onRestorePurchasesPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.planPaywall.restorePurchases')}
              onPress={iapBusy ? undefined : onRestorePurchasesPress}
              disabled={iapBusy}
              className="max-w-[72%] shrink py-1"
              style={{ alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' }}
            >
              <Text
                className="text-right text-[16px] font-semibold leading-[18px]"
                style={{ color: iapBusy ? c.text.muted : c.accent.primary }}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {t('settings.planPaywall.restorePurchases')}
              </Text>
            </Pressable>
          ) : (
            <View className="h-11 w-11 shrink-0" />
          )}
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 14,
          }}
        >
          <View className="mb-3 flex-row items-center">
            <View
              className="mr-2.5 h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: c.background.tertiary }}
            >
              <Crown size={20} color={c.accent.primary} strokeWidth={1.8} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[20px] font-bold leading-6" style={{ color: c.text.primary }}>
                {t('settings.planPaywall.title')}
              </Text>
              <Text
                className="mt-0.5 text-[13px] leading-[17px]"
                style={{ color: c.text.secondary }}
              >
                {t('settings.planPaywall.subtitle')}
              </Text>
            </View>
          </View>
          <View
            className="mb-2.5 rounded-2xl border"
            style={{ borderColor: c.border.default, backgroundColor: c.background.secondary }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: freeLimitsExpanded }}
              accessibilityLabel={t('settings.planPaywall.freeLimitsDisclosureTitle')}
              onPress={() => {
                hapticSelection();
                setFreeLimitsExpanded((v) => !v);
              }}
              className="flex-row items-center justify-between gap-3 px-4 py-3"
              style={{ minHeight: 44 }}
            >
              <Text
                className="min-w-0 flex-1 text-sm font-semibold"
                style={{ color: c.text.primary }}
                numberOfLines={2}
              >
                {t('settings.planPaywall.freeLimitsDisclosureTitle')}
              </Text>
              <Animated.View
                style={[
                  freeLimitsChevronStyle,
                  {
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <ChevronDown size={20} color={c.text.secondary} strokeWidth={2.2} />
              </Animated.View>
            </Pressable>
            {freeLimitsExpanded ? (
              <View
                className="border-t px-4 pb-3 pt-2.5"
                style={{ borderTopColor: c.border.default, gap: PLAN_PAYWALL_FEATURE_LIST_GAP }}
              >
                <FeatureRow mutedCheck text={t('settings.planPaywall.freeLimits.manualAi')} />
                <FeatureRow
                  mutedCheck
                  text={t('settings.planPaywall.freeLimits.recording', {
                    minutes: FREE_MAX_MINUTES,
                  })}
                />
                <FeatureRow
                  mutedCheck
                  text={t('settings.planPaywall.freeLimits.weeklyAi', { limit: freeAiLimit })}
                />
              </View>
            ) : null}
          </View>
          <View
            className="mb-4 rounded-2xl border-2 p-4"
            style={{
              borderColor: `${c.accent.primary}99`,
              backgroundColor: c.background.secondary,
            }}
          >
            <View style={{ gap: PLAN_PAYWALL_FEATURE_LIST_GAP }}>
              <View
                className="flex-row items-start gap-2"
                accessibilityRole="header"
                accessibilityLabel={t('settings.planPaywall.proTitle')}
              >
                <View className="min-w-0 flex-1">
                  <FeatureRow text={t('settings.planPaywall.features.autoAutomation')} emphasized />
                </View>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  className="shrink-0 rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: `${c.accent.primary}22`,
                    marginTop: (PLAN_PAYWALL_FEATURE_LINE_HEIGHT - 20) / 2,
                  }}
                >
                  <Text className="text-[11px] font-semibold" style={{ color: c.accent.primary }}>
                    {t('settings.planPaywall.proTitle').toUpperCase()}
                  </Text>
                </View>
              </View>
              <FeatureRow
                text={t('settings.planPaywall.features.recordingUpToOneHour')}
                emphasized
              />
              <FeatureRow
                text={t('settings.planPaywall.features.aiLimit', { limit: proAiLimit })}
                emphasized
              />
              <FeatureRow
                text={t('settings.planPaywall.features.meetingModeAndPinnedMoments')}
                emphasized
              />
              <FeatureRow text={t('settings.planPaywall.features.extendedShareAndBatchExport')} />
              <FeatureRow text={t('settings.planPaywall.features.accentCustomization')} />
              <FeatureRow text={t('settings.planPaywall.features.folderColors')} />
              <FeatureRow text={t('settings.planPaywall.features.noAds')} />
            </View>
            {isIapPublic && onIapBillingPeriodChange && iapProPriceLoading ? (
              <IapPlanOptionsSkeleton c={c} />
            ) : null}
            {isIapPublic && !iapProPriceLoading && iapDualBilling && onIapBillingPeriodChange ? (
              <View className="mt-3 gap-2.5">
                {iapAnnualRow && (
                  <SubscriptionPlanOptionCard
                    c={c}
                    t={t}
                    title={t('settings.planPaywall.billingAnnual')}
                    intro={iapAnnualRow.introFree}
                    billedHeadline={`${iapAnnualRow.priceString}${t('settings.planPaywall.billingSlashYear')}`}
                    billedHeadlineCompareAt={iapDualBilling ? iapAnnualCompareAtYear : null}
                    subordinateLine={
                      iapAnnualRow.pricePerMonthString
                        ? t('settings.planPaywall.billingEquivalentPerMonth', {
                            price: `${iapAnnualRow.pricePerMonthString}${t('settings.planPaywall.billingSlashMonth')}`,
                          })
                        : null
                    }
                    selected={selectedIapPeriod === 'annual'}
                    onPress={() => onIapBillingPeriodChange('annual')}
                    disabled={iapBusy}
                    saveBadgePercent={iapSavePercent}
                  />
                )}
                {iapMonthlyRow && (
                  <SubscriptionPlanOptionCard
                    c={c}
                    t={t}
                    title={t('settings.planPaywall.billingMonthly')}
                    intro={iapMonthlyRow.introFree}
                    billedHeadline={`${iapMonthlyRow.priceString}${t('settings.planPaywall.billingSlashMonth')}`}
                    billedHeadlineCompareAt={null}
                    subordinateLine={null}
                    selected={selectedIapPeriod === 'monthly'}
                    onPress={() => onIapBillingPeriodChange('monthly')}
                    disabled={iapBusy}
                    saveBadgePercent={null}
                  />
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: insets.bottom + 2,
            backgroundColor: c.background.primary,
          }}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            label={upgradeLabel}
            loading={isIapPublic && (iapBusy || iapProPriceLoading)}
            onPress={onUpgradePress}
            disabled={upgradeDisabled}
            color={c}
            activeOpacity={0.85}
          />
          {isIapPublic && getWebsiteUrl().trim().length > 0 && (
            <View className="mt-2.5 items-center gap-y-1 gap-x-3 px-2 flex-row justify-center">
              <Pressable
                accessibilityRole="link"
                className="py-1"
                onPress={() =>
                  void openInAppBrowser(`${getWebsiteUrl()}/terms`, browserColorScheme)
                }
                disabled={iapBusy}
              >
                <Text
                  className="text-center text-[12px] font-medium underline"
                  style={{ color: iapBusy ? c.text.muted : c.accent.primary }}
                >
                  {t('settings.planPaywall.termsLink')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                className="py-1"
                onPress={() =>
                  void openInAppBrowser(`${getWebsiteUrl()}/privacy`, browserColorScheme)
                }
                disabled={iapBusy}
              >
                <Text
                  className="text-center text-[12px] font-medium underline"
                  style={{ color: iapBusy ? c.text.muted : c.accent.primary }}
                >
                  {t('settings.planPaywall.privacyLink')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
