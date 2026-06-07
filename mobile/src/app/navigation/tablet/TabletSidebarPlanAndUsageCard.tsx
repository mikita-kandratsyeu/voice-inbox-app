import { ChevronRight, Crown } from 'lucide-react-native';
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
import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
const CARD_RADIUS = 14;
const ICON_SIZE = 34;

type Props = {
  color: Colors;
  monetizationMode: MonetizationMode;
  onOpenPlanPaywall: () => void;
};

function PlanCardGradient({ color }: { color: Colors }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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
            width: 150,
            height: 100,
            borderRadius: 999,
            backgroundColor: `${color.accent.primary}22`,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -56,
            left: -22,
            width: 160,
            height: 110,
            borderRadius: 999,
            backgroundColor: `${color.accent.primary}12`,
          }}
        />
      </View>
    </View>
  );
}

export function TabletSidebarPlanAndUsageCard({
  color,
  monetizationMode,
  onOpenPlanPaywall,
}: Props) {
  const { t } = useTranslation();
  const accent = color.accent.primary;
  const loggedSoonRef = useRef(false);
  const borderPulse = useSharedValue(0);

  useEffect(() => {
    borderPulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [borderPulse]);

  useEffect(() => {
    if (monetizationMode === 'coming_soon' && !loggedSoonRef.current) {
      loggedSoonRef.current = true;
      void logAnalyticsEvent('pro_coming_soon_seen', { surface: 'tablet_sidebar_plan_card' });
    }
  }, [monetizationMode]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(borderPulse.value, [0, 1], [`${accent}28`, `${accent}5A`]),
  }));

  const planTitle = t('settings.planStatus.freeSidebarTitle');

  let planSubtitle = t('settings.planStatus.freeValueSubtitle');
  if (monetizationMode === 'coming_soon') {
    planSubtitle = t('settings.planStatus.freeValueSubtitleSoon');
  } else if (monetizationMode === 'iap_public') {
    planSubtitle = t('settings.planStatus.freeValueSubtitleAvailable');
  }

  const statusBadge =
    monetizationMode === 'coming_soon' ? t('settings.planStatus.soonBadge') : null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[
        styles.card,
        {
          borderRadius: CARD_RADIUS,
          borderWidth: 1,
          backgroundColor: `${accent}0f`,
        },
        animatedBorderStyle,
      ]}
    >
      <PlanCardGradient color={color} />
      <Pressable
        onPress={onOpenPlanPaywall}
        accessibilityRole="button"
        accessibilityLabel={t('settings.planStatus.a11yOpenPlansSidebar')}
        accessibilityHint={t('settings.planStatus.a11yOpenPlansHint')}
        style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: color.background.tertiary,
                borderColor: withAlphaHex(accent, 0.18),
              },
            ]}
          >
            <Crown size={18} color={accent} strokeWidth={1.9} />
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[styles.planTitle, { color: color.text.primary }]}>
                {planTitle}
              </Text>
              {statusBadge != null ? (
                <View style={[styles.badge, { backgroundColor: withAlphaHex(accent, 0.14) }]}>
                  <Text style={[styles.badgeText, { color: accent }]}>{statusBadge}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={2} style={[styles.planSubtitle, { color: color.text.secondary }]}>
              {planSubtitle}
            </Text>
            <Text style={[styles.planCta, { color: accent }]}>
              {t('settings.planStatus.comparePlansCta')}
            </Text>
          </View>
          <ChevronRight size={16} color={color.icon.muted} strokeWidth={2} style={styles.chevron} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 10,
    position: 'relative',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
    height: ICON_SIZE,
    justifyContent: 'center',
    width: ICON_SIZE,
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  planSubtitle: {
    fontSize: 12,
    lineHeight: 15,
  },
  planCta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    flexShrink: 0,
    opacity: 0.8,
  },
});
