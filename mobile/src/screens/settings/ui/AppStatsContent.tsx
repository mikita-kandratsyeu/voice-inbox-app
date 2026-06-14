import { BarChart2, ChartPie, Tag as TagIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useRecordStore } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { getAnimationDuration, SPRING_CONFIGS, useColors } from '@/shared/config';
import { Tag } from '@/shared/ui';

import { buildAppStats, formatDigestDurationMs } from '../lib/appStats';
import type { DigestPeriod } from '../lib/digest';
import { getSettingsIconColor } from '../lib/settingsIconColor';
import { DigestSectionCard } from './DigestScreenCards';

const CLASS_COLORS: Record<string, (c: Colors) => string> = {
  work: (c) => c.accent.primary,
  meeting: (c) => c.accent.transcript,
  idea: (c) => c.accent.aiData,
  personal: (c) => c.accent.cache,
  other: (c) => c.accent.models,
};

const CLASS_ORDER = ['work', 'meeting', 'idea', 'personal', 'other'] as const;

type AnimatedMetricCardProps = {
  label: string;
  helper: string;
  rawValue: number;
  formatter: (n: number) => string;
  tone: string;
};

function AnimatedMetricCard({ label, helper, rawValue, formatter, tone }: AnimatedMetricCardProps) {
  const color = useColors();
  const sv = useSharedValue(0);
  const [display, setDisplay] = useState(formatter(0));

  const updateDisplay = useCallback(
    (value: number) => {
      setDisplay(formatter(value));
    },
    [formatter],
  );

  useEffect(() => {
    sv.value = 0;
    sv.value = withTiming(rawValue, {
      duration: getAnimationDuration(900),
      easing: Easing.out(Easing.cubic),
    });
  }, [rawValue, sv]);

  useAnimatedReaction(
    () => Math.round(sv.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(updateDisplay)(current);
      }
    },
  );

  return (
    <View
      className="flex-1 rounded-2xl p-4"
      style={{
        minWidth: '47%',
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: color.text.muted }}
      >
        {label}
      </Text>
      <Text className="mt-2 text-[22px] font-semibold leading-7" style={{ color: tone }}>
        {display}
      </Text>
      <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
        {helper}
      </Text>
    </View>
  );
}

const BAR_MAX_H = 56;

type ActivityBarProps = {
  count: number;
  maxCount: number;
  label: string;
  delay: number;
  color: Colors;
  dense?: boolean;
};

function ActivityBar({ count, maxCount, label, delay, color, dense }: ActivityBarProps) {
  const targetH = maxCount > 0 ? Math.max(count > 0 ? 4 : 0, (count / maxCount) * BAR_MAX_H) : 0;
  const heightSv = useSharedValue(0);

  useEffect(() => {
    heightSv.value = 0;
    heightSv.value = withDelay(
      getAnimationDuration(delay),
      withSpring(targetH, SPRING_CONFIGS.gentle),
    );
  }, [targetH, delay, heightSv]);

  const barStyle = useAnimatedStyle(() => ({ height: heightSv.value }));

  return (
    <View style={styles.activityBarWrapper}>
      <View style={[styles.activityBarTrack, { height: BAR_MAX_H }]}>
        <Animated.View
          style={[styles.activityBarFill, { backgroundColor: color.accent.primary }, barStyle]}
        />
      </View>
      <Text
        className="mt-1.5 w-full text-center font-medium"
        style={{
          color: color.text.muted,
          fontSize: dense ? 8 : 10,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

type ClassBarProps = {
  label: string;
  count: number;
  total: number;
  barColor: string;
  delay: number;
  color: Colors;
  isLast?: boolean;
};

function ClassificationBar({ label, count, total, barColor, delay, color, isLast }: ClassBarProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const widthSv = useSharedValue(0);

  useEffect(() => {
    widthSv.value = 0;
    widthSv.value = withDelay(
      getAnimationDuration(delay),
      withTiming(pct, { duration: getAnimationDuration(700), easing: Easing.out(Easing.cubic) }),
    );
  }, [pct, delay, widthSv]);

  const barStyle = useAnimatedStyle(() => ({ width: `${widthSv.value}%` }));

  return (
    <View style={isLast ? undefined : { marginBottom: 14 }}>
      <View className="mb-1.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View style={[styles.classBullet, { backgroundColor: barColor }]} />
          <Text className="text-[14px] font-medium" style={{ color: color.text.primary }}>
            {label}
          </Text>
        </View>
        <Text className="text-[13px] tabular-nums" style={{ color: color.text.secondary }}>
          {count} · {Math.round(pct)}%
        </Text>
      </View>
      <View
        className="h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <Animated.View
          className="h-1.5 rounded-full"
          style={[{ backgroundColor: barColor }, barStyle]}
        />
      </View>
    </View>
  );
}

type AppStatsContentProps = {
  period: DigestPeriod;
  locale: string;
};

export const AppStatsContent = ({ period, locale }: AppStatsContentProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const records = useRecordStore((s) => s.records);

  const stats = useMemo(() => buildAppStats(period, records, locale), [period, records, locale]);

  const formatDurationValue = useCallback(
    (minutes: number) => formatDigestDurationMs(minutes * 60_000, t),
    [t],
  );

  const metricsHelperKey =
    period === 'all' ? 'settings.digest.metrics.allTimeHelper' : 'settings.digest.metrics.recordsHelper';

  const maxDayCount = Math.max(...stats.activityCounts, 1);
  const activityDense = period === 'month' || period === 'all';

  const activityChart = (
    <View className={`w-full flex-row items-end ${activityDense ? 'gap-0.5' : 'gap-1'}`}>
      {stats.activityCounts.map((count, index) => (
        <ActivityBar
          key={`${period}-${index}`}
          count={count}
          maxCount={maxDayCount}
          label={stats.activityLabels[index] ?? ''}
          delay={index * 55}
          color={color}
          dense={activityDense}
        />
      ))}
    </View>
  );

  return (
    <View>
      <View className="mb-5 px-1">
        <Text className="text-[20px] font-semibold leading-7" style={{ color: color.text.primary }}>
          {t('appStats.title')}
        </Text>
      </View>

      <View className="mb-7 flex-row flex-wrap gap-3">
        <AnimatedMetricCard
          label={t('appStats.totalRecords')}
          helper={t(metricsHelperKey)}
          rawValue={stats.total}
          formatter={(n) => `${n}`}
          tone={color.text.primary}
        />
        <AnimatedMetricCard
          label={t('appStats.totalDuration')}
          helper={t('settings.digest.metrics.durationHelper')}
          rawValue={stats.totalMinutes}
          formatter={formatDurationValue}
          tone={color.accent.transcript}
        />
        <AnimatedMetricCard
          label={t('appStats.aiProcessed')}
          helper={t(metricsHelperKey)}
          rawValue={stats.aiPct}
          formatter={(n) => `${n}%`}
          tone={color.accent.aiData}
        />
        <AnimatedMetricCard
          label={t('appStats.tasksCompletion')}
          helper={t(metricsHelperKey)}
          rawValue={stats.tasksPct}
          formatter={(n) => `${n}%`}
          tone={color.accent.primary}
        />
      </View>

      <DigestSectionCard
        title={t(`appStats.activityTitle.${period}`)}
        icon={
          <BarChart2 size={18} color={getSettingsIconColor(color, 'barChart2')} strokeWidth={1.8} />
        }
      >
        {activityChart}
      </DigestSectionCard>

      {stats.total > 0 ? (
        <DigestSectionCard
          title={t('appStats.classification')}
          icon={<ChartPie size={18} color={color.accent.aiData} strokeWidth={1.8} />}
        >
          {CLASS_ORDER.map((cls, index) => (
            <ClassificationBar
              key={cls}
              label={t(`appStats.class.${cls}`)}
              count={stats.classCounts[cls] ?? 0}
              total={stats.total}
              barColor={CLASS_COLORS[cls]!(color)}
              delay={index * 80}
              color={color}
              isLast={index === CLASS_ORDER.length - 1}
            />
          ))}
        </DigestSectionCard>
      ) : null}

      {stats.topTags.length > 0 ? (
        <DigestSectionCard
          title={t('appStats.topTags')}
          icon={<TagIcon size={18} color={color.accent.cache} strokeWidth={1.8} />}
        >
          <View className="flex-row flex-wrap items-center gap-1.5">
            {stats.topTags.map(({ tag, count }) => (
              <Tag key={tag} label={`${tag} · ${count}`} />
            ))}
          </View>
        </DigestSectionCard>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  activityBarWrapper: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  activityBarTrack: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  activityBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  classBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
