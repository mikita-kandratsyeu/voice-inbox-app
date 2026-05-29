import dayjs from 'dayjs';
import { ChevronRight, Crown, Gauge } from 'lucide-react-native';
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
import { withAlphaHex } from '@/shared/lib';
import type { AiUsage } from '@/shared/lib/ai-api';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { SkeletonPulse } from '@/shared/ui';

const CARD_RADIUS = 14;
const ICON_SIZE = 34;
const PROGRESS_HEIGHT = 5;

type Props = {
  color: Colors;
  monetizationMode: MonetizationMode;
  isProActive: boolean;
  showUsage: boolean;
  usage: AiUsage | null;
  usageLoading: boolean;
  onOpenPlanPaywall: () => void;
  onOpenAiUsageDashboard: () => void;
};

function PlanCardGradient({ color, isProActive }: { color: Colors; isProActive: boolean }) {
  const strength = isProActive
    ? { base: '14', topOrb: '30', bottomOrb: '1a' }
    : { base: '0f', topOrb: '22', bottomOrb: '12' };

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
            backgroundColor: `${color.accent.primary}${strength.topOrb}`,
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
            backgroundColor: `${color.accent.primary}${strength.bottomOrb}`,
          }}
        />
      </View>
    </View>
  );
}

function UsageFraction({
  used,
  limit,
  color,
  exhausted,
}: {
  used: number;
  limit: number;
  color: Colors;
  exhausted: boolean;
}) {
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.fraction,
        styles.tabular,
        { color: exhausted ? color.accent.delete : color.text.primary },
      ]}
    >
      <Text
        style={[
          styles.fractionUsed,
          { color: exhausted ? color.accent.delete : color.text.primary },
        ]}
      >
        {used}
      </Text>
      <Text style={[styles.fractionSep, { color: color.text.muted }]}> / {limit}</Text>
    </Text>
  );
}

function ProgressTrack({
  percent,
  fillColor,
  trackColor,
  a11yLabel,
}: {
  percent: number;
  fillColor: string;
  trackColor: string;
  a11yLabel: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      accessibilityLabel={a11yLabel}
      style={[styles.progressTrack, { backgroundColor: trackColor }]}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: `${percent}%`,
            backgroundColor: fillColor,
          },
        ]}
      />
    </View>
  );
}

function SectionDivider({ color }: { color: Colors }) {
  return (
    <View
      style={{
        backgroundColor: withAlphaHex(color.accent.primary, 0.14),
        height: StyleSheet.hairlineWidth,
        marginVertical: 10,
      }}
    />
  );
}

export function TabletSidebarPlanAndUsageCard({
  color,
  monetizationMode,
  isProActive,
  showUsage,
  usage,
  usageLoading,
  onOpenPlanPaywall,
  onOpenAiUsageDashboard,
}: Props) {
  const { t, i18n } = useTranslation();
  const { expiresAtMs } = useProEntitlement();
  const accent = color.accent.primary;
  const loggedSoonRef = useRef(false);
  const borderPulse = useSharedValue(0);

  useEffect(() => {
    if (isProActive) {
      borderPulse.value = 0;
      return;
    }
    borderPulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [isProActive, borderPulse]);

  useEffect(() => {
    if (monetizationMode === 'coming_soon' && !isProActive && !loggedSoonRef.current) {
      loggedSoonRef.current = true;
      void logAnalyticsEvent('pro_coming_soon_seen', { surface: 'tablet_sidebar_plan_card' });
    }
  }, [monetizationMode, isProActive]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    if (isProActive) {
      return { borderColor: `${accent}2A` };
    }
    return {
      borderColor: interpolateColor(borderPulse.value, [0, 1], [`${accent}28`, `${accent}5A`]),
    };
  }, [isProActive, accent]);

  const proExpiresText =
    isProActive && expiresAtMs != null
      ? dayjs(expiresAtMs).locale(resolveDayjsLocale(i18n.language)).format('D MMMM YYYY')
      : null;

  const planTitle = isProActive
    ? t('settings.planStatus.proTitle')
    : t('settings.planStatus.freeSidebarTitle');

  let planSubtitle = t('settings.planStatus.freeValueSubtitle');
  if (isProActive) {
    planSubtitle =
      proExpiresText != null
        ? t('settings.planStatus.proActiveUntil', { date: proExpiresText })
        : t('settings.planStatus.proValueSubtitle');
  } else if (monetizationMode === 'coming_soon') {
    planSubtitle = t('settings.planStatus.freeValueSubtitleSoon');
  } else if (monetizationMode === 'iap_public') {
    planSubtitle = t('settings.planStatus.freeValueSubtitleAvailable');
  }

  const statusBadge =
    monetizationMode === 'coming_soon' && !isProActive ? t('settings.planStatus.soonBadge') : null;

  const isExhausted = usage ? usage.remaining === 0 : false;
  const progressPercent =
    usage && usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const isPastWarningThreshold = Boolean(
    usage && usage.limit > 0 && !isExhausted && usage.used / usage.limit > 0.75,
  );
  const isLowRemaining = Boolean(
    usage && usage.limit > 0 && !isExhausted && usage.remaining / usage.limit <= 0.2,
  );

  const progressFillColor = isExhausted
    ? color.accent.delete
    : isPastWarningThreshold
      ? color.accent.cache
      : accent;

  const progressA11y = usage
    ? t('settings.aiUsage.a11yProgress', { used: usage.used, limit: usage.limit })
    : t('settings.aiUsage.loadFailed');

  const usageFootnote = (() => {
    if (!usage || usageLoading) return null;
    if (isExhausted) return t('settings.aiUsage.exhausted');
    if (isLowRemaining) return t('settings.aiUsage.remaining', { count: usage.remaining });
    return null;
  })();

  const cardBaseTint = isProActive ? '14' : '0f';

  const planRow = (
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
        <Text
          numberOfLines={2}
          style={[
            styles.planSubtitle,
            { color: isProActive ? color.text.primary : color.text.secondary },
          ]}
        >
          {planSubtitle}
        </Text>
        {!isProActive ? (
          <Text style={[styles.planCta, { color: accent }]}>
            {t('settings.planStatus.comparePlansCta')}
          </Text>
        ) : null}
      </View>
      {!isProActive ? (
        <ChevronRight size={16} color={color.icon.muted} strokeWidth={2} style={styles.chevron} />
      ) : null}
    </View>
  );

  const usageRow = (
    <View style={styles.row}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: withAlphaHex(accent, 0.14),
            borderColor: withAlphaHex(accent, 0.2),
          },
        ]}
      >
        <Gauge size={17} color={accent} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.usageTitle, { color: color.text.primary }]}>
          {t('settings.aiUsage.title')}
        </Text>
        {usageLoading ? (
          <SkeletonPulse>
            <View
              style={[styles.fractionSkeleton, { backgroundColor: color.background.tertiary }]}
            />
          </SkeletonPulse>
        ) : usage != null ? (
          <UsageFraction
            used={usage.used}
            limit={usage.limit}
            color={color}
            exhausted={isExhausted}
          />
        ) : (
          <Text style={[styles.loadFailed, { color: color.text.muted }]}>
            {t('settings.aiUsage.unavailable')}
          </Text>
        )}
        {usageLoading ? (
          <SkeletonPulse>
            <View
              style={[styles.progressSkeleton, { backgroundColor: color.background.tertiary }]}
            />
          </SkeletonPulse>
        ) : usage != null ? (
          <ProgressTrack
            percent={progressPercent}
            fillColor={progressFillColor}
            trackColor={withAlphaHex(accent, 0.12)}
            a11yLabel={progressA11y}
          />
        ) : (
          <Text style={[styles.loadFailedHint, { color: color.text.secondary }]}>
            {t('settings.aiUsage.loadFailed')}
          </Text>
        )}
        {usageFootnote ? (
          <Text
            numberOfLines={1}
            style={[
              styles.footnote,
              { color: isExhausted ? color.accent.delete : color.text.secondary },
            ]}
          >
            {usageFootnote}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={16} color={color.icon.muted} strokeWidth={2} style={styles.chevron} />
    </View>
  );

  const cardContent = (
    <>
      <PlanCardGradient color={color} isProActive={isProActive} />
      {!isProActive ? (
        <Pressable
          onPress={onOpenPlanPaywall}
          accessibilityRole="button"
          accessibilityLabel={t('settings.planStatus.a11yOpenPlansSidebar')}
          accessibilityHint={t('settings.planStatus.a11yOpenPlansHint')}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          {planRow}
        </Pressable>
      ) : null}
      {!isProActive && showUsage ? <SectionDivider color={color} /> : null}
      {showUsage ? (
        isProActive ? (
          usageRow
        ) : (
          <Pressable
            onPress={onOpenAiUsageDashboard}
            accessibilityRole="button"
            accessibilityLabel={`${t('settings.aiUsage.title')}. ${progressA11y}`}
            accessibilityHint={t('tablet.sidebar.aiUsage.openDetails')}
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
          >
            {usageRow}
          </Pressable>
        )
      ) : null}
    </>
  );

  if (isProActive && showUsage) {
    return (
      <Pressable
        onPress={onOpenAiUsageDashboard}
        accessibilityRole="button"
        accessibilityLabel={`${t('settings.aiUsage.title')}. ${progressA11y}`}
        accessibilityHint={t('tablet.sidebar.aiUsage.openDetails')}
        style={({ pressed }) => ({
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        <Animated.View
          entering={FadeIn.duration(180)}
          style={[
            styles.card,
            {
              borderRadius: CARD_RADIUS,
              backgroundColor: `${accent}${cardBaseTint}`,
              borderWidth: 1,
            },
            animatedBorderStyle,
          ]}
        >
          {cardContent}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[
        styles.card,
        {
          borderRadius: CARD_RADIUS,
          borderWidth: 1,
          backgroundColor: `${accent}${cardBaseTint}`,
        },
        animatedBorderStyle,
      ]}
    >
      {cardContent}
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
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  planSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  planCta: {
    fontSize: 11,
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
  usageTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  chevron: {
    flexShrink: 0,
    opacity: 0.8,
  },
  fraction: {
    fontSize: 14,
    lineHeight: 18,
  },
  fractionUsed: {
    fontSize: 14,
    fontWeight: '700',
  },
  fractionSep: {
    fontSize: 12,
    fontWeight: '500',
  },
  fractionSkeleton: {
    borderRadius: 5,
    height: 14,
    width: 48,
  },
  progressTrack: {
    borderRadius: PROGRESS_HEIGHT / 2,
    height: PROGRESS_HEIGHT,
    marginTop: 2,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: PROGRESS_HEIGHT / 2,
    height: '100%',
    minWidth: 4,
  },
  progressSkeleton: {
    borderRadius: PROGRESS_HEIGHT / 2,
    height: PROGRESS_HEIGHT,
    marginTop: 2,
  },
  footnote: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 13,
  },
  loadFailed: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadFailedHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
