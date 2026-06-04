import dayjs from 'dayjs';

import type { RecordListItem, TaskItem } from '@/entities/record';
import type { DigestAiResult } from '@/shared/lib/ai-api';
import { storage } from '@/shared/lib/async-storage/mmkv';

export type DigestPeriod = 'day' | 'week' | 'month';
export type DigestFormat = 'brief' | 'detailed' | 'tasks';

export type DigestTask = TaskItem & {
  recordId: string;
  recordTitle: string;
};

export type DeterministicDigest = {
  period: DigestPeriod;
  fromIso: string;
  toIso: string;
  records: RecordListItem[];
  recordCount: number;
  totalDurationMs: number;
  summaries: string[];
  topKeyPhrases: Array<{ phrase: string; count: number }>;
  openTasks: DigestTask[];
  overdueTasks: DigestTask[];
  nextSteps: string[];
  classificationCounts: Array<{ label: string; count: number }>;
};

type CachedDigest = {
  key: string;
  createdAt: string;
  result: DigestAiResult;
};

const CACHE_PREFIX = 'digest.ai.';
const DIGEST_FORMAT_KEY = 'digest.format';
const DIGEST_FORMATS: readonly DigestFormat[] = ['brief', 'detailed', 'tasks'];
/** Notes included in cloud digest payload (longer window needs a bit more coverage). */
export const MAX_AI_NOTES_IN_PAYLOAD = 30;
export const MAX_AI_NOTES_IN_PAYLOAD_MONTH = 40;
export const MAX_DIGEST_SUMMARY_CHARS = 900;

export function parseDigestFormat(value: string | undefined): DigestFormat {
  return DIGEST_FORMATS.includes(value as DigestFormat) ? (value as DigestFormat) : 'brief';
}

export function getStoredDigestFormat(): DigestFormat {
  return parseDigestFormat(storage.getString(DIGEST_FORMAT_KEY));
}

export function saveStoredDigestFormat(format: DigestFormat): void {
  storage.set(DIGEST_FORMAT_KEY, format);
}

export type DigestAiPayloadCoverage = {
  totalNotes: number;
  includedNotes: number;
  notesLimit: number;
  hasOmittedNotes: boolean;
  truncatedSummaryCount: number;
};

export function getDigestAiNotesLimit(period: DigestPeriod): number {
  return period === 'month' ? MAX_AI_NOTES_IN_PAYLOAD_MONTH : MAX_AI_NOTES_IN_PAYLOAD;
}

export function getDigestAiPayloadCoverage(digest: DeterministicDigest): DigestAiPayloadCoverage {
  const notesLimit = getDigestAiNotesLimit(digest.period);
  const includedNotes = Math.min(digest.recordCount, notesLimit);
  const recordsInPayload = digest.records.slice(0, notesLimit);
  const truncatedSummaryCount = recordsInPayload.filter(
    (record) => (record.summary?.trim().length ?? 0) > MAX_DIGEST_SUMMARY_CHARS,
  ).length;

  return {
    totalNotes: digest.recordCount,
    includedNotes,
    notesLimit,
    hasOmittedNotes: digest.recordCount > notesLimit,
    truncatedSummaryCount,
  };
}

export function getDigestRange(period: DigestPeriod, now = dayjs()) {
  if (period === 'day') {
    return {
      from: now.startOf('day'),
      to: now.endOf('day'),
    };
  }

  if (period === 'week') {
    return {
      from: now.subtract(6, 'day').startOf('day'),
      to: now.endOf('day'),
    };
  }

  return {
    from: now.subtract(29, 'day').startOf('day'),
    to: now.endOf('day'),
  };
}

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function truncate(value: string | undefined, maxChars: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, maxChars)}...`;
}

function flattenTasks(records: RecordListItem[]): DigestTask[] {
  return records.flatMap((record) =>
    (record.tasks ?? []).map((task) => ({
      ...task,
      recordId: record.id,
      recordTitle: record.title,
    })),
  );
}

export function buildDeterministicDigest(
  period: DigestPeriod,
  records: RecordListItem[],
): DeterministicDigest {
  const { from, to } = getDigestRange(period);
  const inRange = records
    .filter((record) => {
      const created = dayjs(record.createdAt);
      return (
        created.isValid() &&
        created.isAfter(from.subtract(1, 'millisecond')) &&
        created.isBefore(to.add(1, 'millisecond'))
      );
    })
    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

  const phraseCounts = new Map<string, { phrase: string; count: number }>();
  const classificationCounts = new Map<string, number>();

  for (const record of inRange) {
    if (record.classification) {
      classificationCounts.set(
        record.classification,
        (classificationCounts.get(record.classification) ?? 0) + 1,
      );
    }

    for (const phrase of record.keyPhrases ?? []) {
      const key = normalizeKey(phrase);
      if (!key) continue;
      const existing = phraseCounts.get(key);
      phraseCounts.set(key, {
        phrase: existing?.phrase ?? phrase.trim(),
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  const tasks = flattenTasks(inRange);
  const today = dayjs().startOf('day');
  const openTasks = tasks.filter((task) => !task.isDone);
  const overdueTasks = openTasks.filter((task) => {
    if (!task.deadline) return false;
    const deadline = dayjs(task.deadline);
    return deadline.isValid() && deadline.isBefore(today);
  });

  const seenNextSteps = new Set<string>();
  const nextSteps = inRange
    .flatMap((record) => record.nextSteps ?? [])
    .map((step) => step.trim())
    .filter((step) => {
      const key = normalizeKey(step);
      if (!key || seenNextSteps.has(key)) return false;
      seenNextSteps.add(key);
      return true;
    })
    .slice(0, 12);

  return {
    period,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    records: inRange,
    recordCount: inRange.length,
    totalDurationMs: inRange.reduce((sum, record) => sum + (record.durationMs ?? 0), 0),
    summaries: inRange
      .map((record) => record.summary?.trim())
      .filter((summary): summary is string => Boolean(summary))
      .slice(0, 12),
    topKeyPhrases: [...phraseCounts.values()]
      .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
      .slice(0, 10),
    openTasks: openTasks.slice(0, 20),
    overdueTasks: overdueTasks.slice(0, 10),
    nextSteps,
    classificationCounts: [...classificationCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

export function buildDigestAiPayload(
  digest: DeterministicDigest,
  language: 'en' | 'ru',
  format: DigestFormat,
): string {
  return JSON.stringify({
    language,
    format,
    period: digest.period,
    from: digest.fromIso,
    to: digest.toIso,
    counts: {
      records: digest.recordCount,
      openTasks: digest.openTasks.length,
      overdueTasks: digest.overdueTasks.length,
    },
    topKeyPhrases: digest.topKeyPhrases,
    classificationCounts: digest.classificationCounts,
    openTasks: digest.openTasks.slice(0, 12).map((task) => ({
      text: task.text,
      priority: task.priority,
      deadline: task.deadline,
      deadlineTime: task.deadlineTime,
      recordTitle: task.recordTitle,
    })),
    overdueTasks: digest.overdueTasks.map((task) => ({
      text: task.text,
      deadline: task.deadline,
      deadlineTime: task.deadlineTime,
      recordTitle: task.recordTitle,
    })),
    nextSteps: digest.nextSteps,
    notes: digest.records
      .slice(0, digest.period === 'month' ? MAX_AI_NOTES_IN_PAYLOAD_MONTH : MAX_AI_NOTES_IN_PAYLOAD)
      .map((record) => ({
        id: record.id,
        title: truncate(record.title, 160),
        createdAt: record.createdAt,
        classification: record.classification,
        summary: truncate(record.summary, MAX_DIGEST_SUMMARY_CHARS),
        keyPhrases: record.keyPhrases?.slice(0, 8),
        nextSteps: record.nextSteps?.slice(0, 5),
        tasks: record.tasks?.slice(0, 8).map((task) => ({
          text: task.text,
          isDone: task.isDone,
          priority: task.priority,
          deadline: task.deadline,
          deadlineTime: task.deadlineTime,
        })),
      })),
  });
}

export function getDigestCacheKey(digest: DeterministicDigest, format: DigestFormat): string {
  const newestRecord = digest.records[0]?.createdAt ?? 'empty';
  const taskFingerprint = digest.openTasks
    .map(
      (task) =>
        `${task.recordId}:${task.id}:${task.isDone ? '1' : '0'}:${task.deadline ?? ''}:${
          task.deadlineTime ?? ''
        }`,
    )
    .join('|');
  return `${digest.period}:${format}:${digest.fromIso}:${digest.toIso}:${digest.recordCount}:${newestRecord}:${taskFingerprint}`;
}

export function loadCachedDigest(key: string): CachedDigest | null {
  try {
    const raw = storage.getString(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDigest;
    if (parsed?.key === key && parsed.result?.markdown) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveCachedDigest(key: string, result: DigestAiResult): CachedDigest {
  const cached = {
    key,
    createdAt: new Date().toISOString(),
    result,
  };
  storage.set(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
  return cached;
}

export function buildDigestSharePayload(params: {
  title: string;
  periodLabel: string;
  rangeText: string;
  formatLabel: string;
  generatedAtText: string;
  sourceNote: string;
  labels: {
    period: string;
    dates: string;
    format: string;
    generated: string;
  };
  markdown: string;
}): { message: string; title: string } {
  const headline = `${params.title} — ${params.periodLabel}`;
  const header = [
    `# ${params.title}`,
    '',
    `${params.labels.period}: ${params.periodLabel}`,
    `${params.labels.dates}: ${params.rangeText}`,
    `${params.labels.format}: ${params.formatLabel}`,
    `${params.labels.generated}: ${params.generatedAtText}`,
    '',
    params.sourceNote,
    '',
    '---',
    '',
  ].join('\n');

  return {
    title: headline,
    message: `${header}${params.markdown.trim()}`,
  };
}
