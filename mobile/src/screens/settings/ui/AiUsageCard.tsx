import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';

import { getColors } from '@/shared/config';
import type { AiUsage } from '@/shared/lib/ai-api';

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

export const AiUsageCard = ({ usage, loading }: AiUsageCardProps) => {
  const { t, i18n } = useTranslation();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');

  if (loading) {
    return (
      <View
        className="mb-6 flex-row items-center justify-center rounded-2xl px-4 py-5"
        style={{
          borderWidth: 1,
          borderColor: color.border.default,
          backgroundColor: color.background.primary,
        }}
      >
        <ActivityIndicator size="small" color={color.accent.primary} />
        <Text className="ml-2 text-sm" style={{ color: color.text.secondary }}>
          {t('settings.aiUsage.loading')}
        </Text>
      </View>
    );
  }

  if (!usage) {
    return null;
  }

  const isLow = usage.remaining <= 10;
  const isExhausted = usage.remaining === 0;
  const progressPercent = Math.min(100, (usage.used / usage.limit) * 100);

  return (
    <View
      className="mb-6 overflow-hidden rounded-2xl px-4 py-4"
      style={{
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

      <View className="mb-2">
        <View className="mb-1 flex-row justify-between">
          <Text
            className="text-sm font-medium"
            style={{
              color: isExhausted ? color.accent.delete : color.text.primary,
            }}
          >
            {t('settings.aiUsage.used', {
              used: usage.used,
              limit: usage.limit,
            })}
          </Text>
          <Text
            className="text-sm font-medium"
            style={{
              color: isExhausted ? color.accent.delete : color.accent.primary,
            }}
          >
            {isExhausted
              ? t('settings.aiUsage.exhausted')
              : t('settings.aiUsage.remaining', { count: usage.remaining })}
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

      <Text className="text-xs" style={{ color: color.text.secondary }}>
        {t('settings.aiUsage.resetAt', {
          date: formatResetDate(usage.resetAt, i18n.language),
        })}
      </Text>
    </View>
  );
};
