import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { Gauge, PlayCircle } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import type { AiUsage } from '@/shared/lib/ai-api';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { SkeletonPulse } from '@/shared/ui';

const formatResetDate = (isoString: string, locale: string): string => {
  const dayjsLocale = resolveDayjsLocale(locale);
  const date = dayjs(isoString);

  if (!date.isValid()) return '—';

  return date.locale(dayjsLocale).format('dddd, D MMMM HH:mm');
};

function getAiUsageStatusText(usage: AiUsage | null, isExhausted: boolean, t: TFunction): string {
  if (!usage) {
    return t('settings.aiUsage.unavailable');
  }
  if (isExhausted) {
    return t('settings.aiUsage.exhausted');
  }
  return '';
}

function resolveClaimBonusErrorMessage(claimError: string, t: TFunction): string {
  switch (claimError) {
    case 'claimAdFailed':
      return t('settings.aiUsage.claimBonusError');
    case 'claimAdIosAd':
      return t('settings.aiUsage.claimBonusErrorIosAd');
    case 'claimAdNoInventory':
      return t('settings.aiUsage.claimBonusErrorNoInventory');
    case 'claimBonusNoUsage':
      return t('settings.aiUsage.claimBonusNoUsage');
    default:
      return claimError;
  }
}

type ClaimBonusPressableBodyProps = {
  color: Colors;
  claimLoading: boolean;
  claimDisabled: boolean;
  bonusAmount: number;
  t: TFunction;
};

function ClaimBonusPressableBody({
  color,
  claimLoading,
  claimDisabled,
  bonusAmount,
  t,
}: ClaimBonusPressableBodyProps) {
  if (claimLoading) {
    return (
      <View className="min-h-[52px] items-center justify-center py-3">
        <ActivityIndicator size="small" color={color.accent.primary} />
        <Text className="mt-2 text-center text-xs" style={{ color: color.text.secondary }}>
          {t('settings.aiUsage.claimBonusLoading')}
        </Text>
      </View>
    );
  }

  if (claimDisabled) {
    return (
      <View className="min-h-[52px] items-center justify-center px-4 py-3.5">
        <Text
          className="text-center text-sm font-medium leading-5"
          style={{ color: color.text.muted }}
        >
          {t('settings.aiUsage.claimBonusCooldown')}
        </Text>
      </View>
    );
  }

  return (
    <View className="min-h-[52px] flex-row items-center gap-3 px-4 py-3.5">
      <PlayCircle size={26} color={color.accent.primary} strokeWidth={1.75} />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold leading-5" style={{ color: color.accent.primary }}>
          {t('settings.aiUsage.claimBonusTitle')}
        </Text>
        <Text className="mt-0.5 text-xs leading-4" style={{ color: color.text.secondary }}>
          {t('settings.aiUsage.claimBonusSubtitle', { count: bonusAmount })}
        </Text>
      </View>
    </View>
  );
}

type AiUsageCardProps = {
  usage: AiUsage | null;
  loading: boolean;
  onClaimBonus?: () => void;
  claimLoading?: boolean;
  claimError?: string | null;
};

function AiUsageSkeleton({ color }: { color: Colors }) {
  return (
    <SkeletonPulse>
      <View className="mb-2">
        <View className="mb-1.5 flex-row justify-between gap-2">
          <View
            className="h-3.5 w-16 rounded"
            style={{ backgroundColor: color.background.tertiary }}
          />
          <View
            className="h-3.5 w-20 rounded"
            style={{ backgroundColor: color.background.tertiary }}
          />
        </View>
        <View
          className="h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: color.background.tertiary }}
        />
      </View>
      <View className="h-3 w-36 rounded" style={{ backgroundColor: color.background.tertiary }} />
    </SkeletonPulse>
  );
}

export const AiUsageCard = ({
  usage,
  loading,
  onClaimBonus,
  claimLoading = false,
  claimError = null,
}: AiUsageCardProps) => {
  const { t, i18n } = useTranslation();
  const color = useColors();

  const claimDisabled = claimError === 'claimCooldown';
  const bonusAmount = usage?.bonusAmount ?? 5;
  const canShowBonusButton = Boolean(usage && usage.used > 0);
  const showBonusNoUsageHint = Boolean(usage && usage.used === 0 && onClaimBonus);

  const isExhausted = usage ? usage.remaining === 0 : false;
  const progressPercent =
    usage && usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const isPastWarningThreshold = Boolean(
    usage && usage.limit > 0 && !isExhausted && usage.used / usage.limit > 0.75,
  );
  const progressFillColor = isExhausted
    ? color.accent.delete
    : isPastWarningThreshold
      ? color.accent.cache
      : color.accent.primary;

  const usageText = usage ? `${usage.used} / ${usage.limit}` : '—';
  const statusText = getAiUsageStatusText(usage, isExhausted, t);
  const resetDateText = usage ? formatResetDate(usage.resetAt, i18n.language) : '—';

  const progressA11y = usage
    ? t('settings.aiUsage.a11yProgress', {
        used: usage.used,
        limit: usage.limit,
      })
    : t('settings.aiUsage.title');

  return (
    <View
      className="mb-8 overflow-hidden rounded-2xl p-5"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.primary,
      }}
    >
      <View className="mb-4 flex-row items-center">
        <View
          className="mr-3 h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Gauge size={22} color={color.accent.primary} strokeWidth={1.8} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold" style={{ color: color.text.primary }}>
            {t('settings.aiUsage.title')}
          </Text>
          <Text className="mt-1 text-sm leading-5" style={{ color: color.text.secondary }}>
            {t('settings.aiUsage.subtitle')}
          </Text>
        </View>
      </View>

      {loading ? (
        <AiUsageSkeleton color={color} />
      ) : (
        <>
          <View className="mb-2">
            <View className="mb-2 flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
              {usage == null && (
                <Text className="text-sm font-medium" style={{ color: color.text.secondary }}>
                  {statusText}
                </Text>
              )}
              {usage != null && !isExhausted && (
                <Text
                  className="text-[15px] font-semibold"
                  style={[styles.tabular, { color: color.text.primary }]}
                  accessibilityLabel={progressA11y}
                >
                  {usageText}
                </Text>
              )}
              {usage != null && isExhausted && (
                <>
                  <Text
                    className="text-[15px] font-semibold"
                    style={[styles.tabular, { color: color.accent.delete }]}
                    accessibilityLabel={progressA11y}
                  >
                    {usageText}
                  </Text>
                  <Text
                    className="max-w-[58%] text-right text-sm font-medium leading-5"
                    style={{ color: color.accent.delete }}
                  >
                    {statusText}
                  </Text>
                </>
              )}
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(progressPercent),
              }}
              accessibilityLabel={progressA11y}
              className="h-2.5 overflow-hidden rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: progressFillColor,
                }}
              />
            </View>
          </View>
          <Text
            className="text-xs leading-4"
            style={{
              color: color.text.secondary,
              marginBottom: onClaimBonus && (canShowBonusButton || showBonusNoUsageHint) ? 12 : 6,
            }}
          >
            {t('settings.aiUsage.resetAt', { date: resetDateText })}
          </Text>

          {showBonusNoUsageHint && (
            <Text className="mt-2 text-xs leading-4" style={{ color: color.text.secondary }}>
              {t('settings.aiUsage.claimBonusUnavailableHint')}
            </Text>
          )}
          {onClaimBonus && canShowBonusButton && (
            <View className="mt-2">
              <Pressable
                onPress={onClaimBonus}
                disabled={claimLoading || claimDisabled}
                accessibilityRole="button"
                accessibilityLabel={t('settings.aiUsage.claimBonus', { count: bonusAmount })}
                className="overflow-hidden rounded-2xl"
                style={{
                  borderWidth: 1.5,
                  borderColor:
                    claimLoading || claimDisabled ? color.border.default : color.accent.primary,
                  backgroundColor:
                    claimLoading || claimDisabled
                      ? color.background.tertiary
                      : color.background.primary,
                  minHeight: 52,
                }}
              >
                <ClaimBonusPressableBody
                  color={color}
                  claimLoading={claimLoading}
                  claimDisabled={claimDisabled}
                  bonusAmount={bonusAmount}
                  t={t}
                />
              </Pressable>
              {claimError && claimError !== 'claimCooldown' && (
                <Text
                  className="mt-2 px-1 text-center text-xs leading-4"
                  style={{ color: color.accent.delete }}
                >
                  {resolveClaimBonusErrorMessage(claimError, t)}
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
