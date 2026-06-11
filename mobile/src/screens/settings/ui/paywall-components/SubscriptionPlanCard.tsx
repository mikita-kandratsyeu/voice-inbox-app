import type { TFunction } from 'i18next';
import { Check } from 'lucide-react-native';
import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { IapIntroFreePeriod } from '@/features/entitlements';
import type { Colors } from '@/shared/config';
import { IS_ANDROID } from '@/shared/lib/platform';

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

type SubscriptionPlanCardProps = {
  color: Colors;
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

export const SubscriptionPlanCard = memo(function SubscriptionPlanCard({
  color,
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
}: SubscriptionPlanCardProps) {
  const introText = introCaptionForFreeTrial(intro, t);
  const showBadge = saveBadgePercent != null && saveBadgePercent > 0;
  const a11yLabel = [title, introText, billedHeadline, subordinateLine].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="w-full rounded-2xl px-4 pb-2.5 pt-2.5"
      style={{
        alignSelf: 'stretch',
        borderWidth: 2,
        borderColor: selected ? color.accent.primary : color.border.default,
        backgroundColor: selected ? `${color.accent.primary}12` : color.background.primary,
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
            backgroundColor: color.accent.primary,
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
              color: color.text.primary,
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
                backgroundColor: color.accent.primary,
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
                color: color.text.muted,
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
                color: color.text.primary,
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
              color: color.text.primary,
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
              color: color.text.muted,
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
              color: color.text.secondary,
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
});
