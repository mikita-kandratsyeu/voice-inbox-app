import { BarChart2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useSettingsStackBack } from '@/app/navigation/useSettingsStackBack';
import { useRecordStore } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { getAnimationDuration, SPRING_CONFIGS, useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection, Tag } from '@/shared/ui';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDayLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function getDayDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toDateString();
}

const CLASS_COLORS: Record<string, (c: Colors) => string> = {
  work: (c) => c.accent.primary,
  meeting: (c) => c.accent.transcript,
  idea: (c) => c.accent.aiData,
  personal: (c) => c.accent.cache,
  other: (c) => c.accent.models,
};

const CLASS_ORDER = ['work', 'meeting', 'idea', 'personal', 'other'] as const;

// ─── AnimatedMetricCard ──────────────────────────────────────────────────────

type MetricCardProps = {
  label: string;
  rawValue: number;
  formatter: (n: number) => string;
  tone: string;
  color: Colors;
};

function AnimatedMetricCard({ label, rawValue, formatter, tone, color }: MetricCardProps) {
  const sv = useSharedValue(0);
  const [display, setDisplay] = useState(formatter(0));

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
        setDisplay(formatter(current));
      }
    },
  );

  return (
    <View
      style={[
        styles.metricCard,
        { borderColor: color.border.default, backgroundColor: color.background.card },
      ]}
    >
      <Text style={[styles.metricLabel, { color: color.text.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: tone }]}>{display}</Text>
    </View>
  );
}

// ─── ActivityBar ─────────────────────────────────────────────────────────────

const BAR_MAX_H = 56;

type ActivityBarProps = {
  count: number;
  maxCount: number;
  label: string;
  delay: number;
  color: Colors;
};

function ActivityBar({ count, maxCount, label, delay, color }: ActivityBarProps) {
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
      <Text style={[styles.activityBarLabel, { color: color.text.muted }]}>{label}</Text>
      {count > 0 ? (
        <Text style={[styles.activityBarCount, { color: color.text.secondary }]}>{count}</Text>
      ) : null}
    </View>
  );
}

// ─── ClassificationBar ───────────────────────────────────────────────────────

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
    <View style={[styles.classRow, isLast ? {} : { marginBottom: 14 }]}>
      <View style={styles.classRowHeader}>
        <View style={styles.classRowLeft}>
          <View style={[styles.classBullet, { backgroundColor: barColor }]} />
          <Text style={[styles.classLabel, { color: color.text.primary }]}>{label}</Text>
        </View>
        <Text style={[styles.classCount, { color: color.text.secondary }]}>
          {count} · {Math.round(pct)}%
        </Text>
      </View>
      <View style={[styles.classTrack, { backgroundColor: color.background.tertiary }]}>
        <Animated.View style={[styles.classFill, { backgroundColor: barColor }, barStyle]} />
      </View>
    </View>
  );
}

// ─── AppStatsScreen ──────────────────────────────────────────────────────────

export const AppStatsScreen = () => {
  const { t } = useTranslation();
  const handleBack = useSettingsStackBack();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();

  const records = useRecordStore((s) => s.records);
  const purgeRecordPermanently = useRecordStore((s) => s.purgeRecordPermanently);

  const stats = useMemo(() => {
    const total = records.length;
    const totalMs = records.reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
    const totalMinutes = Math.floor(totalMs / 60000);

    const aiDone = records.filter((r) => r.aiStatus === 'done').length;
    const aiPct = total > 0 ? Math.round((aiDone / total) * 100) : 0;

    const allTasks = records.flatMap((r) => r.tasks ?? []);
    const doneTasks = allTasks.filter((t) => t.isDone).length;
    const tasksPct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

    const dayCounts = Array.from({ length: 7 }, (_, i) => {
      const dateStr = getDayDateString(6 - i);
      return records.filter(
        (r) => r.createdAt != null && new Date(r.createdAt).toDateString() === dateStr,
      ).length;
    });
    const dayLabels = Array.from({ length: 7 }, (_, i) => getDayLabel(6 - i));

    const classCounts: Record<string, number> = {
      work: 0,
      meeting: 0,
      idea: 0,
      personal: 0,
      other: 0,
    };
    for (const r of records) {
      const cls = r.classification ?? 'other';
      if (cls in classCounts) {
        classCounts[cls] += 1;
      } else {
        classCounts.other += 1;
      }
    }

    const tagFreq: Record<string, number> = {};
    for (const r of records) {
      for (const tag of r.tags ?? []) {
        tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
      }
    }
    const topTags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    return { total, totalMinutes, aiPct, tasksPct, dayCounts, dayLabels, classCounts, topTags };
  }, [records]);

  const maxDayCount = Math.max(...stats.dayCounts, 1);

  const handleDeleteAll = () => {
    Alert.alert(t('storage.deleteAllData'), t('storage.deleteAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('appStats.deleteAllAction'),
        style: 'destructive',
        onPress: async () => {
          for (const r of records) {
            await purgeRecordPermanently(r.id);
          }
        },
      },
    ]);
  };

  const sectionCardStyle = [
    styles.sectionCard,
    { borderColor: color.border.default, backgroundColor: color.background.card },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('appStats.title')} onBack={handleBack} />
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: 16,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── metric cards ─────────────────────────────────── */}
          <View style={styles.metricGrid}>
            <AnimatedMetricCard
              label={t('appStats.totalRecords')}
              rawValue={stats.total}
              formatter={String}
              tone={color.accent.primary}
              color={color}
            />
            <AnimatedMetricCard
              label={t('appStats.totalDuration')}
              rawValue={stats.totalMinutes}
              formatter={formatMinutes}
              tone={color.accent.success}
              color={color}
            />
            <AnimatedMetricCard
              label={t('appStats.aiProcessed')}
              rawValue={stats.aiPct}
              formatter={(n) => `${n}%`}
              tone={color.accent.aiData}
              color={color}
            />
            <AnimatedMetricCard
              label={t('appStats.tasksCompletion')}
              rawValue={stats.tasksPct}
              formatter={(n) => `${n}%`}
              tone={color.accent.transcript}
              color={color}
            />
          </View>

          {/* ── weekly activity ───────────────────────────────── */}
          <Animated.View
            entering={FadeIn.duration(320)}
            style={[sectionCardStyle, { marginBottom: 24 }]}
          >
            <Text style={[styles.cardTitle, { color: color.text.secondary }]}>
              {t('appStats.weeklyActivity')}
            </Text>
            <View style={styles.activityChart}>
              {stats.dayCounts.map((count, i) => (
                <ActivityBar
                  key={i}
                  count={count}
                  maxCount={maxDayCount}
                  label={stats.dayLabels[i] ?? ''}
                  delay={i * 55}
                  color={color}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── classification breakdown ──────────────────────── */}
          {stats.total > 0 ? (
            <Animated.View
              entering={FadeIn.duration(320)}
              style={[sectionCardStyle, { marginBottom: 24 }]}
            >
              <Text style={[styles.cardTitle, { color: color.text.secondary }]}>
                {t('appStats.classification')}
              </Text>
              {CLASS_ORDER.map((cls, i) => (
                <ClassificationBar
                  key={cls}
                  label={t(`appStats.class.${cls}`)}
                  count={stats.classCounts[cls] ?? 0}
                  total={stats.total}
                  barColor={CLASS_COLORS[cls]!(color)}
                  delay={i * 80}
                  color={color}
                  isLast={i === CLASS_ORDER.length - 1}
                />
              ))}
            </Animated.View>
          ) : null}

          {/* ── top tags ─────────────────────────────────────── */}
          {stats.topTags.length > 0 ? (
            <Animated.View entering={FadeIn.duration(320)} style={{ marginBottom: 24 }}>
              <Text style={[styles.sectionHeader, { color: color.text.secondary }]}>
                {t('appStats.topTags')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagList}
              >
                {stats.topTags.map(({ tag, count }) => (
                  <Tag key={tag} label={`${tag} · ${count}`} />
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}

          {/* ── empty state hint ─────────────────────────────── */}
          {stats.total === 0 ? (
            <Animated.View
              entering={FadeIn.duration(320)}
              style={[
                sectionCardStyle,
                { marginBottom: 24, alignItems: 'center', paddingVertical: 32 },
              ]}
            >
              <BarChart2 size={40} color={color.text.muted} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: color.text.primary }]}>
                {t('appStats.emptyTitle')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: color.text.secondary }]}>
                {t('appStats.emptySubtitle')}
              </Text>
            </Animated.View>
          ) : null}

          {/* ── data management ──────────────────────────────── */}
          <SettingsSection title={t('appStats.dataManagement')}>
            <SettingsRow
              label={t('appStats.deleteAllRow')}
              onPress={handleDeleteAll}
              dangerous
              isFirst
              isLast
            />
          </SettingsSection>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 34,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  activityChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  activityBarWrapper: {
    flex: 1,
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
  activityBarLabel: {
    fontSize: 10,
    marginTop: 5,
    fontWeight: '500',
  },
  activityBarCount: {
    fontSize: 10,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  classRow: {},
  classRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  classRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  classLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  classCount: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  classTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  classFill: {
    height: 6,
    borderRadius: 3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tagList: {
    gap: 8,
    paddingHorizontal: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
