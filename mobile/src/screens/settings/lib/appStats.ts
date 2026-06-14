import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

import type { RecordListItem } from '@/entities/record';
import { formatWeekdayShort, resolveDayjsLocale } from '@/shared/lib/date';

import { type DigestPeriod, getDigestRange } from './digest';

export type AppStats = {
  total: number;
  totalDurationMs: number;
  totalMinutes: number;
  aiPct: number;
  tasksPct: number;
  activityCounts: number[];
  activityLabels: string[];
  classCounts: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
};

const CLASS_KEYS = ['work', 'meeting', 'idea', 'personal', 'other'] as const;

function filterRecordsInPeriod(records: RecordListItem[], period: DigestPeriod): RecordListItem[] {
  if (period === 'all') {
    return records.filter((record) => dayjs(record.createdAt).isValid());
  }

  const { from, to } = getDigestRange(period);

  return records.filter((record) => {
    const created = dayjs(record.createdAt);
    return (
      created.isValid() &&
      created.isAfter(from.subtract(1, 'millisecond')) &&
      created.isBefore(to.add(1, 'millisecond'))
    );
  });
}

function buildActivitySeries(
  period: DigestPeriod,
  inRange: RecordListItem[],
  locale: string,
): { activityCounts: number[]; activityLabels: string[] } {
  const { from, to } = getDigestRange(period);
  const dayjsLocale = resolveDayjsLocale(locale);

  if (period === 'all') {
    const monthCount = 12;
    const end = dayjs().endOf('month');
    const activityCounts = Array.from({ length: monthCount }, (_, index) => {
      const monthStart = end.subtract(monthCount - 1 - index, 'month').startOf('month');
      const monthEnd = monthStart.endOf('month');
      return inRange.filter((record) => {
        const created = dayjs(record.createdAt);
        return !created.isBefore(monthStart) && !created.isAfter(monthEnd);
      }).length;
    });
    const activityLabels = Array.from({ length: monthCount }, (_, index) =>
      end
        .subtract(monthCount - 1 - index, 'month')
        .startOf('month')
        .locale(dayjsLocale)
        .format('MMM'),
    );
    return { activityCounts, activityLabels };
  }

  if (period === 'day') {
    const bucketHours = 4;
    const bucketCount = 6;
    const activityCounts = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = from.add(index * bucketHours, 'hour');
      const bucketEnd = bucketStart.add(bucketHours, 'hour');
      return inRange.filter((record) => {
        const created = dayjs(record.createdAt);
        return !created.isBefore(bucketStart) && created.isBefore(bucketEnd);
      }).length;
    });
    const activityLabels = Array.from({ length: bucketCount }, (_, index) =>
      from
        .add(index * bucketHours, 'hour')
        .locale(dayjsLocale)
        .format('HH:mm'),
    );
    return { activityCounts, activityLabels };
  }

  const dayCount = to.diff(from, 'day') + 1;
  const activityCounts = Array.from({ length: dayCount }, (_, index) => {
    const day = from.add(index, 'day');
    return inRange.filter((record) => dayjs(record.createdAt).isSame(day, 'day')).length;
  });
  const activityLabels = Array.from({ length: dayCount }, (_, index) => {
    const day = from.add(index, 'day').locale(dayjsLocale);
    return period === 'week' ? formatWeekdayShort(day, locale) : day.format('D');
  });

  return { activityCounts, activityLabels };
}

export function formatDigestDurationMs(durationMs: number, t: TFunction): string {
  const minutes = Math.round(durationMs / 60_000);
  if (minutes < 60) {
    return t('settings.digest.durationMinutes', { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0
    ? t('settings.digest.durationHoursMinutes', { hours, minutes: rest })
    : t('settings.digest.durationHours', { count: hours });
}

export function buildAppStats(
  period: DigestPeriod,
  records: RecordListItem[],
  locale: string,
): AppStats {
  const inRange = filterRecordsInPeriod(records, period);
  const total = inRange.length;
  const totalDurationMs = inRange.reduce((sum, record) => sum + (record.durationMs ?? 0), 0);
  const totalMinutes = Math.floor(totalDurationMs / 60_000);

  const aiDone = inRange.filter((record) => record.aiStatus === 'done').length;
  const aiPct = total > 0 ? Math.round((aiDone / total) * 100) : 0;

  const allTasks = inRange.flatMap((record) => record.tasks ?? []);
  const doneTasks = allTasks.filter((task) => task.isDone).length;
  const tasksPct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

  const classCounts: Record<string, number> = {
    work: 0,
    meeting: 0,
    idea: 0,
    personal: 0,
    other: 0,
  };
  for (const record of inRange) {
    const cls = record.classification ?? 'other';
    if (CLASS_KEYS.includes(cls as (typeof CLASS_KEYS)[number])) {
      classCounts[cls] += 1;
    } else {
      classCounts.other += 1;
    }
  }

  const tagFreq: Record<string, number> = {};
  for (const record of inRange) {
    for (const tag of record.tags ?? []) {
      tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }));

  const { activityCounts, activityLabels } = buildActivitySeries(period, inRange, locale);

  return {
    total,
    totalDurationMs,
    totalMinutes,
    aiPct,
    tasksPct,
    activityCounts,
    activityLabels,
    classCounts,
    topTags,
  };
}
