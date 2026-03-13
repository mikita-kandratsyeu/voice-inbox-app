import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { getColors, useAppTheme } from '@/shared/config';
import type { AiUsage } from '@/shared/lib/ai-api';
import { SkeletonPulse } from '@/shared/ui';

const CARD_HEIGHT = 170;

const formatResetDate = (isoString: string, locale: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type AiUsageCardProps = {
  usage: AiUsage | null;
  loading: boolean;
};

function AiUsageSkeleton({ color }: { color: ReturnType<typeof getColors> }) {
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

export const AiUsageCard = ({ usage, loading }: AiUsageCardProps) => {
  const { t, i18n } = useTranslation();
  const color = getColors(useAppTheme());

  const isExhausted = usage ? usage.remaining === 0 : false;
  const progressPercent = usage ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  const usageText = usage ? `${usage.used} / ${usage.limit}` : '—';
  const statusText = usage
    ? isExhausted
      ? t('settings.aiUsage.exhausted')
      : t('settings.aiUsage.remaining', { count: usage.remaining })
    : t('settings.aiUsage.unavailable');
  const resetDateText = usage ? formatResetDate(usage.resetAt, i18n.language) : '—';

  return (
    <View
      className="mb-6 overflow-hidden rounded-2xl p-4"
      style={{
        height: CARD_HEIGHT,
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.primary,
      }}
    >
      <View className="mb-3 flex-row items-center">
        <View
          className="mr-3 rounded-full p-2"
          style={{ backgroundColor: color.accent.primary + '20' }}
        >
          <Sparkles size={20} color={color.accent.primary} strokeWidth={1.8} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: color.text.primary }}>
            {t('settings.aiUsage.title')}
          </Text>
          <Text className="mt-0.5 text-sm" style={{ color: color.text.secondary }}>
            {t('settings.aiUsage.subtitle')}
          </Text>
        </View>
      </View>

      {loading ? (
        <AiUsageSkeleton color={color} />
      ) : (
        <>
          <View className="mb-2">
            <View className="mb-1 flex-row justify-between">
              <Text
                className="text-sm font-medium"
                style={{
                  color: isExhausted ? color.accent.delete : color.text.primary,
                }}
              >
                {usageText}
              </Text>
              <Text
                className="text-sm font-medium"
                style={{
                  color: isExhausted ? color.accent.delete : color.accent.primary,
                }}
              >
                {statusText}
              </Text>
            </View>
            <View
              className="h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: isExhausted ? color.accent.delete : color.accent.primary,
                }}
              />
            </View>
          </View>

          <Text className="text-xs" style={{ color: color.text.secondary, marginBottom: 6 }}>
            {t('settings.aiUsage.resetAt', { date: resetDateText })}
          </Text>
        </>
      )}
    </View>
  );
};
