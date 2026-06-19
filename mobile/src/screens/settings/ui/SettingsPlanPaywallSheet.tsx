import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FREE_MAX_RECORDING_MS, type MonetizationMode } from '@/features/app-storefront';
import type { IapBillingOptions, IapBillingPeriod } from '@/features/entitlements';
import { openInAppBrowser } from '@/features/in-app-browser';
import { getWebsiteUrl, useAppTheme, useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib/platform';
import { FrostedHeaderIconButton, PlanPaywallProChip, SheetFooterButtons } from '@/shared/ui';

import {
  ExpandableSection,
  FeatureRow,
  PaywallHeader,
  PlanPricingSkeleton,
  SubscriptionPlanCard,
} from './paywall-components';

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

const PLAN_PAYWALL_FEATURE_LIST_GAP = 8;
const FREE_MAX_MINUTES = Math.round(FREE_MAX_RECORDING_MS / 60_000);

const EMPTY_IAP_BILLING: IapBillingOptions = {
  annual: null,
  monthly: null,
  annualComparedToMonthlyYearPriceString: null,
  savePercentVsMonthly: null,
};

export function SettingsPlanPaywallSheet({
  visible,
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
  const color = useColors();
  const browserColorScheme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [freeLimitsExpanded, setFreeLimitsExpanded] = useState(false);
  const [proFeaturesExpanded, setProFeaturesExpanded] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFreeLimitsExpanded(false);
      setProFeaturesExpanded(false);
    }
  }, [visible]);

  const isIapPublic = true;

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
    iapBusy || (isIapPublic && Boolean(onIapBillingPeriodChange) && iapProPriceLoading);

  const upgradeLabel = t('settings.planPaywall.upgrade');

  const handlePeriodChange = useCallback(
    (period: IapBillingPeriod) => {
      onIapBillingPeriodChange?.(period);
    },
    [onIapBillingPeriodChange],
  );

  const handleLinkPress = useCallback(
    (path: string) => {
      if (iapBusy) return;
      void openInAppBrowser(`${getWebsiteUrl()}${path}`, browserColorScheme);
    },
    [browserColorScheme, iapBusy],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      {...(IS_IOS ? ({ presentationStyle: 'fullScreen' } as const) : {})}
    >
      <View style={{ flex: 1, backgroundColor: color.background.primary }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between gap-2 px-4 pb-2"
          style={{
            backgroundColor: color.background.primary,
            borderBottomWidth: 1,
            borderBottomColor: color.border.default,
            paddingTop: insets.top + 2,
          }}
        >
          <FrostedHeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<X size={22} color={color.text.primary} strokeWidth={2.2} />}
            color={color}
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
                style={{ color: iapBusy ? color.text.muted : color.accent.primary }}
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

        {/* Content */}
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
          <PaywallHeader
            color={color}
            title={t('settings.planPaywall.title')}
            subtitle={t('settings.planPaywall.subtitle')}
          />

          {/* Free Limits Section */}
          <View className="mb-2.5">
            <ExpandableSection
              color={color}
              title={t('settings.planPaywall.freeLimitsDisclosureTitle')}
              expanded={freeLimitsExpanded}
              onToggle={() => setFreeLimitsExpanded((v) => !v)}
            >
              <View style={{ gap: PLAN_PAYWALL_FEATURE_LIST_GAP }}>
                <FeatureRow
                  color={color}
                  mutedCheck
                  text={t('settings.planPaywall.freeLimits.manualAi')}
                />
                <FeatureRow
                  color={color}
                  mutedCheck
                  text={t('settings.planPaywall.freeLimits.basicModels')}
                />
                <FeatureRow
                  color={color}
                  mutedCheck
                  text={t('settings.planPaywall.freeLimits.recording', {
                    minutes: FREE_MAX_MINUTES,
                  })}
                />
                <FeatureRow
                  color={color}
                  mutedCheck
                  text={t('settings.planPaywall.freeLimits.weeklyAi', { limit: freeAiLimit })}
                />
              </View>
            </ExpandableSection>
          </View>

          {/* Pro Features Section */}
          <View
            className="mb-4 rounded-2xl border-2 p-4"
            style={{
              borderColor: `${color.accent.primary}99`,
              backgroundColor: color.background.secondary,
            }}
          >
            <View style={{ gap: PLAN_PAYWALL_FEATURE_LIST_GAP }}>
              <View
                className="flex-row items-start gap-2"
                accessibilityRole="header"
                accessibilityLabel={t('settings.planPaywall.proTitle')}
              >
                <View className="min-w-0 flex-1">
                  <FeatureRow
                    color={color}
                    text={t('settings.planPaywall.features.autoAutomation')}
                    emphasized
                  />
                </View>
                <PlanPaywallProChip />
              </View>
              <FeatureRow
                color={color}
                text={t('settings.planPaywall.features.recordingUpToOneHour')}
                emphasized
              />
              <FeatureRow
                color={color}
                text={t('settings.planPaywall.features.aiLimit', { limit: proAiLimit })}
                emphasized
              />
              <FeatureRow
                color={color}
                text={t('settings.planPaywall.features.meetingModeAndPinnedMoments')}
                emphasized
              />
              <FeatureRow color={color} text={t('settings.planPaywall.features.premiumAiModels')} />
              <FeatureRow color={color} text={t('settings.planPaywall.features.githubSync')} />
            </View>

            <ExpandableSection
              color={color}
              title={t('settings.planPaywall.proFeaturesMoreTitle')}
              expanded={proFeaturesExpanded}
              onToggle={() => setProFeaturesExpanded((v) => !v)}
              containerStyle="transparent"
            >
              <View style={{ gap: PLAN_PAYWALL_FEATURE_LIST_GAP }}>
                <FeatureRow
                  color={color}
                  text={t('settings.planPaywall.features.extendedShareAndBatchExport')}
                />
                <FeatureRow
                  color={color}
                  text={t('settings.planPaywall.features.aiFolderOrganize')}
                />
                <FeatureRow color={color} text={t('settings.planPaywall.features.notesGraph')} />
                <FeatureRow
                  color={color}
                  text={t('settings.planPaywall.features.accentCustomization')}
                />
                <FeatureRow color={color} text={t('settings.planPaywall.features.folderColors')} />
                <FeatureRow color={color} text={t('settings.planPaywall.features.noAds')} />
              </View>
            </ExpandableSection>

            {/* Pricing Options */}
            {isIapPublic && onIapBillingPeriodChange && iapProPriceLoading ? (
              <PlanPricingSkeleton color={color} />
            ) : null}
            {isIapPublic && !iapProPriceLoading && iapDualBilling && onIapBillingPeriodChange ? (
              <View className="mt-3 gap-2.5">
                {iapAnnualRow && (
                  <SubscriptionPlanCard
                    color={color}
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
                    onPress={() => handlePeriodChange('annual')}
                    disabled={iapBusy}
                    saveBadgePercent={iapSavePercent}
                  />
                )}
                {iapMonthlyRow && (
                  <SubscriptionPlanCard
                    color={color}
                    t={t}
                    title={t('settings.planPaywall.billingMonthly')}
                    intro={iapMonthlyRow.introFree}
                    billedHeadline={`${iapMonthlyRow.priceString}${t('settings.planPaywall.billingSlashMonth')}`}
                    billedHeadlineCompareAt={null}
                    subordinateLine={null}
                    selected={selectedIapPeriod === 'monthly'}
                    onPress={() => handlePeriodChange('monthly')}
                    disabled={iapBusy}
                    saveBadgePercent={null}
                  />
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: insets.bottom + 2,
            backgroundColor: color.background.primary,
          }}
        >
          <SheetFooterButtons
            className="w-full"
            color={color}
            primaryLabel={upgradeLabel}
            onPrimaryPress={() => onUpgradePress?.()}
            primaryDisabled={upgradeDisabled}
            primaryLoading={isIapPublic && (iapBusy || iapProPriceLoading)}
          />
          {isIapPublic && getWebsiteUrl().trim().length > 0 && (
            <View className="mt-2.5 flex-row items-center justify-center gap-x-3 gap-y-1 px-2">
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('settings.planPaywall.termsLink')}
                className="py-1"
                onPress={() => handleLinkPress('/terms')}
                disabled={iapBusy}
              >
                <Text
                  className="text-center text-[12px] font-medium underline"
                  style={{ color: iapBusy ? color.text.muted : color.accent.primary }}
                >
                  {t('settings.planPaywall.termsLink')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('settings.planPaywall.privacyLink')}
                className="py-1"
                onPress={() => handleLinkPress('/privacy')}
                disabled={iapBusy}
              >
                <Text
                  className="text-center text-[12px] font-medium underline"
                  style={{ color: iapBusy ? color.text.muted : color.accent.primary }}
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
