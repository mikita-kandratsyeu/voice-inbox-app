import type { TFunction } from 'i18next';
import { Check, Crown, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FREE_MAX_RECORDING_MS, type MonetizationMode } from '@/features/app-storefront';
import type {
  IapBillingOptions,
  IapBillingPeriod,
  IapIntroFreePeriod,
} from '@/features/entitlements';
import { openInAppBrowser } from '@/features/in-app-browser';
import { getWebsiteUrl, useAppTheme, useColors } from '@/shared/config';
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
  annual: null,
  monthly: null,
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

type SubscriptionPlanOptionCardProps = {
  c: ThemeColors;
  t: TFunction;
  title: string;
  intro: IapIntroFreePeriod | null;
  billedHeadline: string;
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
      className="w-full rounded-2xl px-4 pb-3 pt-3"
      style={{
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: selected ? c.accent.primary : c.border.default,
        backgroundColor: selected ? `${c.accent.primary}12` : c.background.primary,
      }}
    >
      {selected ? (
        <View
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
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
            className="text-[16px] font-bold leading-5"
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

        <Text
          className="mt-2 text-[16px] font-semibold leading-[22px]"
          style={{
            color: c.text.primary,
            ...(IS_ANDROID ? { includeFontPadding: false } : {}),
          }}
          numberOfLines={2}
        >
          {billedHeadline}
        </Text>
        {subordinateLine ? (
          <Text
            className="mt-1 text-[12px] leading-[16px]"
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
            className="mt-1.5 text-[11px] leading-[14px]"
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      {...(IS_IOS ? ({ presentationStyle: 'fullScreen' } as const) : {})}
    >
      <View style={{ flex: 1, backgroundColor: c.background.primary }}>
        <View
          className="flex-row items-center justify-between gap-2 px-4 pb-3"
          style={{
            backgroundColor: c.background.primary,
            borderBottomWidth: 1,
            borderBottomColor: c.border.default,
            paddingTop: insets.top + 12,
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
            paddingTop: 16,
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
            <View className="min-w-0 flex-1">
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
              <FeatureRow
                text={t('settings.planPaywall.features.autoSummaryAndTasks')}
                emphasized
              />
              <FeatureRow
                text={t('settings.planPaywall.features.autoArchiveReadNotes')}
                emphasized
              />
              <FeatureRow text={t('settings.planPaywall.features.recordingUpTo30Min')} />
              <FeatureRow
                text={t('settings.planPaywall.features.aiLimit', { limit: proAiLimit })}
              />
              <FeatureRow text={t('settings.planPaywall.features.noAds')} />
            </View>
            {isIapPublic && !iapProPriceLoading && iapDualBilling && onIapBillingPeriodChange && (
              <View className="mt-4 gap-3">
                {iapMonthlyRow && (
                  <SubscriptionPlanOptionCard
                    c={c}
                    t={t}
                    title={t('settings.planPaywall.billingMonthly')}
                    intro={iapMonthlyRow.introFree}
                    billedHeadline={`${iapMonthlyRow.priceString}${t('settings.planPaywall.billingSlashMonth')}`}
                    subordinateLine={null}
                    selected={selectedIapPeriod === 'monthly'}
                    onPress={() => onIapBillingPeriodChange('monthly')}
                    disabled={iapBusy}
                    saveBadgePercent={null}
                  />
                )}
                {iapAnnualRow && (
                  <SubscriptionPlanOptionCard
                    c={c}
                    t={t}
                    title={t('settings.planPaywall.billingAnnual')}
                    intro={iapAnnualRow.introFree}
                    billedHeadline={`${iapAnnualRow.priceString}${t('settings.planPaywall.billingSlashYear')}`}
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
              </View>
            )}
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
          {isIapPublic && getWebsiteUrl().trim().length > 0 && (
            <View className="mt-4 items-center gap-y-2 px-2">
              <Pressable
                accessibilityRole="link"
                className="py-1"
                onPress={() =>
                  void openInAppBrowser(`${getWebsiteUrl()}/terms`, browserColorScheme)
                }
                disabled={iapBusy}
              >
                <Text
                  className="text-center text-[13px] font-medium underline"
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
                  className="text-center text-[13px] font-medium underline"
                  style={{ color: iapBusy ? c.text.muted : c.accent.primary }}
                >
                  {t('settings.planPaywall.privacyLink')}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
