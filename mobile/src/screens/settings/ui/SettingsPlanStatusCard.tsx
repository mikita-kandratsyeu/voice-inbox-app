import dayjs from 'dayjs';
import { Crown } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { type MonetizationMode } from '@/features/app-storefront';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { resolveDayjsLocale } from '@/shared/lib/date';

type SettingsPlanStatusCardProps = {
  color: Colors;
  monetizationMode: MonetizationMode;
  aiLimit: number;
  onPress?: () => void;
};

const CARD_RADIUS = 16;

export function SettingsPlanStatusCard({
  color,
  monetizationMode,
  aiLimit,
  onPress,
}: SettingsPlanStatusCardProps) {
  const { t, i18n } = useTranslation();
  const { isProActive, expiresAtMs } = useProEntitlement();
  const loggedSoonRef = useRef(false);
  const borderPulse = useSharedValue(0);

  useEffect(() => {
    if (isProActive) {
      borderPulse.value = 0;
      return;
    }
    borderPulse.value = withRepeat(
      withTiming(1, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [isProActive, borderPulse]);

  useEffect(() => {
    if (monetizationMode === 'coming_soon' && !isProActive && !loggedSoonRef.current) {
      loggedSoonRef.current = true;
      void logAnalyticsEvent('pro_coming_soon_seen', { surface: 'settings_plan_card' });
    }
  }, [monetizationMode, isProActive]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    if (isProActive) {
      return { borderColor: `${color.accent.primary}2A` };
    }
    return {
      borderColor: interpolateColor(
        borderPulse.value,
        [0, 1],
        [`${color.accent.primary}28`, `${color.accent.primary}5A`],
      ),
    };
  }, [isProActive, color.accent.primary]);

  const proExpiresText =
    isProActive && expiresAtMs != null
      ? dayjs(expiresAtMs).locale(resolveDayjsLocale(i18n.language)).format('D MMMM YYYY')
      : null;

  const title = isProActive
    ? t('settings.planStatus.proTitle')
    : t('settings.planStatus.freeTitle');

  let subtitle = t('settings.planStatus.freeValueSubtitle', { limit: aiLimit });
  if (isProActive) {
    subtitle =
      proExpiresText != null
        ? t('settings.planStatus.proActiveUntil', { date: proExpiresText })
        : t('settings.planStatus.proValueSubtitle');
  } else if (monetizationMode === 'coming_soon') {
    subtitle = t('settings.planStatus.freeValueSubtitleSoon', { limit: aiLimit });
  } else if (monetizationMode === 'iap_public') {
    subtitle = t('settings.planStatus.freeValueSubtitleAvailable', { limit: aiLimit });
  }

  let statusBadge: string | null = null;

  if (monetizationMode === 'coming_soon' && !isProActive) {
    statusBadge = t('settings.planStatus.soonBadge');
  }

  const accessibilityLabel = isProActive
    ? t('settings.planStatus.a11yCurrentPlanPro', {
        date: proExpiresText ?? t('settings.planStatus.a11yUnknownDate'),
      })
    : t('settings.planStatus.a11yOpenPlans');
  const accessibilityHint = isProActive
    ? monetizationMode === 'iap_public'
      ? t('settings.planStatus.a11yManageSubscriptionsHint')
      : t('settings.planStatus.a11yCurrentPlanHint')
    : t('settings.planStatus.a11yOpenPlansHint');
  const cardBaseTint = isProActive ? '14' : '0f';
  const gradientStrength = isProActive
    ? { topOrb: '30', bottomOrb: '1a' }
    : { topOrb: '22', bottomOrb: '12' };

  return (
    <Pressable
      onPress={onPress}
      disabled={onPress == null}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: onPress == null }}
    >
      <Animated.View
        entering={FadeIn.duration(160).delay(24)}
        className="mb-4 overflow-hidden rounded-2xl p-5"
        style={[
          {
            borderWidth: 1,
            borderRadius: CARD_RADIUS,
            backgroundColor: `${color.accent.primary}${cardBaseTint}`,
          },
          animatedBorderStyle,
        ]}
      >
        <View pointerEvents="none" style={{ ...StyleSheet.absoluteFill }}>
          <View
            style={{
              ...StyleSheet.absoluteFill,
              borderRadius: CARD_RADIUS,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -28,
                right: -24,
                width: 170,
                height: 115,
                borderRadius: 999,
                backgroundColor: `${color.accent.primary}${gradientStrength.topOrb}`,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -62,
                left: -26,
                width: 190,
                height: 130,
                borderRadius: 999,
                backgroundColor: `${color.accent.primary}${gradientStrength.bottomOrb}`,
              }}
            />
          </View>
        </View>
        <View className="flex-row items-center">
          <View
            className="mr-3 h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: color.background.tertiary }}
          >
            <Crown size={28} color={color.accent.primary} strokeWidth={1.75} />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-semibold" style={{ color: color.text.primary }}>
                {title}
              </Text>
              {statusBadge != null && (
                <View
                  className="ml-2 rounded-full px-2.5 py-1"
                  style={{ backgroundColor: `${color.accent.primary}18` }}
                >
                  <Text
                    className="text-[11px] font-semibold"
                    style={{ color: color.accent.primary }}
                  >
                    {statusBadge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              className="mt-1 text-sm leading-5"
              style={{ color: isProActive ? color.text.primary : color.text.secondary }}
            >
              {subtitle}
            </Text>
            {!isProActive && (
              <Text className="mt-2 text-xs font-semibold" style={{ color: color.accent.primary }}>
                {t('settings.planStatus.comparePlansCta')}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
