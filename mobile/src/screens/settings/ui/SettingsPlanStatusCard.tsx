import { Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getShowProUpsellHints } from '@/features/app-storefront';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { logAnalyticsEvent } from '@/shared/lib/analytics';

type SettingsPlanStatusCardProps = {
  color: Colors;
};

export function SettingsPlanStatusCard({ color }: SettingsPlanStatusCardProps) {
  const { t, i18n } = useTranslation();
  const { isProActive, expiresAtMs } = useProEntitlement();
  const showSoon = getShowProUpsellHints();
  const loggedSoonRef = useRef(false);

  useEffect(() => {
    if (showSoon && !isProActive && !loggedSoonRef.current) {
      loggedSoonRef.current = true;
      void logAnalyticsEvent('pro_coming_soon_seen', { surface: 'settings_plan_card' });
    }
  }, [showSoon, isProActive]);

  const proExpiresText =
    isProActive && expiresAtMs != null
      ? new Date(expiresAtMs).toLocaleString(i18n.language, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;

  const title = isProActive
    ? t('settings.planStatus.proTitle')
    : t('settings.planStatus.freeTitle');
  const subtitle = isProActive
    ? proExpiresText != null
      ? t('settings.planStatus.proActiveUntil', { date: proExpiresText })
      : t('settings.planStatus.proSubtitle')
    : showSoon
      ? t('settings.planStatus.freeSubtitleSoon')
      : t('settings.planStatus.freeSubtitle');

  return (
    <Animated.View
      entering={FadeIn.duration(160).delay(24)}
      className="mb-6 overflow-hidden rounded-2xl p-4"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.primary,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="mr-3 h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Zap size={28} color={color.accent.primary} strokeWidth={1.75} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold" style={{ color: color.text.primary }}>
            {title}
          </Text>
          <Text className="mt-1 text-sm leading-5" style={{ color: color.text.secondary }}>
            {subtitle}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
