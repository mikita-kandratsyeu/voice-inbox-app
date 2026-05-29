import { ChevronRight, Gauge } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import type { AiUsage } from '@/shared/lib/ai-api';
import { SkeletonPulse } from '@/shared/ui';

type Props = {
  color: Colors;
  usage: AiUsage | null;
  loading: boolean;
  onPress: () => void;
};

const CARD_RADIUS = 14;
const ICON_SIZE = 34;
const PROGRESS_HEIGHT = 5;

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

export function TabletSidebarAiUsageCard({ color, usage, loading, onPress }: Props) {
  const { t } = useTranslation();
  const accent = color.accent.primary;

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

  const a11yTitle = t('settings.aiUsage.title');

  const footnote = (() => {
    if (!usage || loading) return null;
    if (isExhausted) return t('settings.aiUsage.exhausted');
    if (isLowRemaining) return t('settings.aiUsage.remaining', { count: usage.remaining });
    return null;
  })();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${a11yTitle}. ${progressA11y}`}
      accessibilityHint={t('tablet.sidebar.aiUsage.openDetails')}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        style={[
          styles.card,
          {
            borderRadius: CARD_RADIUS,
            borderColor: withAlphaHex(accent, isExhausted ? 0.22 : 0.16),
            backgroundColor: withAlphaHex(accent, isExhausted ? 0.08 : 0.05),
          },
        ]}
      >
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
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
              style={[styles.title, { color: color.text.primary }]}
            >
              {a11yTitle}
            </Text>

            {loading ? (
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

            {loading ? (
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

            {footnote ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.footnote,
                  { color: isExhausted ? color.accent.delete : color.text.secondary },
                ]}
              >
                {footnote}
              </Text>
            ) : null}
          </View>

          <View style={styles.chevronWrap}>
            <ChevronRight size={16} color={color.icon.muted} strokeWidth={2} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chevronWrap: {
    alignSelf: 'center',
    flexShrink: 0,
    opacity: 0.8,
    paddingLeft: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
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
    width: 48,
    height: 14,
    borderRadius: 5,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    borderRadius: PROGRESS_HEIGHT / 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: PROGRESS_HEIGHT / 2,
    minWidth: 4,
  },
  progressSkeleton: {
    height: PROGRESS_HEIGHT,
    borderRadius: PROGRESS_HEIGHT / 2,
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
