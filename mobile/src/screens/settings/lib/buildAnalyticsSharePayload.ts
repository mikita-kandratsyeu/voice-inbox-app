import dayjs from 'dayjs';

import type { AppStats } from './appStats';
import type { DeterministicDigest, DigestTask } from './digest';

export type AnalyticsShareLabels = {
  title: string;
  period: string;
  dates: string;
  exported: string;
  sourceNote: string;
  overview: string;
  totalRecords: string;
  totalDuration: string;
  aiProcessed: string;
  tasksCompletion: string;
  activity: string;
  activityColumnLabel: string;
  activityColumnCount: string;
  classification: string;
  classificationType: string;
  classificationCount: string;
  classificationShare: string;
  topTags: string;
  topicsTitle: string;
  nextStepsTitle: string;
  openTasksTitle: string;
  overdueTitle: string;
  empty: string;
  class: Record<string, string>;
};

const CLASS_ORDER = ['work', 'meeting', 'idea', 'personal', 'other'] as const;

function markdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '';
  const headerLine = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return [headerLine, separator, body].join('\n');
}

function bulletList(items: string[], emptyText: string): string {
  if (items.length === 0) return `_${emptyText}_`;
  return items.map((item) => `- ${item}`).join('\n');
}

function formatTopicLine(phrase: string, count: number): string {
  return count > 1 ? `${phrase} ×${count}` : phrase;
}

export function formatAnalyticsTaskLine(
  task: DigestTask,
  formatDeadlineTime: (hhmm: string | null | undefined) => string = (hhmm) =>
    hhmm?.trim() ? ` ${hhmm.trim().slice(0, 5)}` : '',
): string {
  const time = task.deadlineTime ? formatDeadlineTime(task.deadlineTime) : '';
  const deadline = task.deadline ? ` — ${dayjs(task.deadline).format('D MMM')}${time}` : '';
  return `${task.text}${deadline}`;
}

export function buildAnalyticsSharePayload(params: {
  periodLabel: string;
  rangeText: string;
  exportedAtText: string;
  stats: AppStats;
  digest: DeterministicDigest;
  labels: AnalyticsShareLabels;
  formatDuration: (durationMs: number) => string;
  formatTaskLine?: (task: DigestTask) => string;
}): { message: string; title: string } {
  const { labels, stats, digest } = params;
  const formatTaskLine =
    params.formatTaskLine ?? ((task: DigestTask) => formatAnalyticsTaskLine(task));
  const headline = `${labels.title} — ${params.periodLabel}`;

  const header = [
    `# ${labels.title}`,
    '',
    `**${labels.period}:** ${params.periodLabel}`,
    `**${labels.dates}:** ${params.rangeText}`,
    `**${labels.exported}:** ${params.exportedAtText}`,
    '',
    `_${labels.sourceNote}_`,
    '',
  ].join('\n');

  const overviewTable = markdownTable(
    [labels.overview, ''],
    [
      [labels.totalRecords, String(stats.total)],
      [labels.totalDuration, params.formatDuration(stats.totalDurationMs)],
      [labels.aiProcessed, `${stats.aiPct}%`],
      [labels.tasksCompletion, `${stats.tasksPct}%`],
    ],
  );

  const activityTable = markdownTable(
    [labels.activityColumnLabel, labels.activityColumnCount],
    stats.activityLabels.map((label, index) => [label, String(stats.activityCounts[index] ?? 0)]),
  );

  const classificationRows = CLASS_ORDER.map((cls) => {
    const count = stats.classCounts[cls] ?? 0;
    const share = stats.total > 0 ? `${Math.round((count / stats.total) * 100)}%` : '0%';
    return [labels.class[cls] ?? cls, String(count), share];
  });

  const classificationTable =
    stats.total > 0
      ? markdownTable(
          [labels.classificationType, labels.classificationCount, labels.classificationShare],
          classificationRows,
        )
      : '';

  const tagLines = stats.topTags.map(({ tag, count }) => `${tag} · ${count}`);
  const topicLines = digest.topKeyPhrases.map(({ phrase, count }) =>
    formatTopicLine(phrase, count),
  );
  const nextStepLines = digest.nextSteps;
  const openTaskLines = digest.openTasks.map(formatTaskLine);
  const overdueTaskLines = digest.overdueTasks.map(formatTaskLine);

  const sections = [
    `## ${labels.overview}`,
    '',
    overviewTable,
    '',
    `## ${labels.activity}`,
    '',
    activityTable,
  ];

  if (classificationTable) {
    sections.push('', `## ${labels.classification}`, '', classificationTable);
  }

  sections.push(
    '',
    `## ${labels.topTags}`,
    '',
    bulletList(tagLines, labels.empty),
    '',
    `## ${labels.topicsTitle}`,
    '',
    bulletList(topicLines, labels.empty),
    '',
    `## ${labels.nextStepsTitle}`,
    '',
    bulletList(nextStepLines, labels.empty),
    '',
    `## ${labels.openTasksTitle}`,
    '',
    bulletList(openTaskLines, labels.empty),
  );

  if (digest.overdueTasks.length > 0) {
    sections.push('', `## ${labels.overdueTitle}`, '', bulletList(overdueTaskLines, labels.empty));
  }

  return {
    title: headline,
    message: `${header}${sections.join('\n').trim()}\n`,
  };
}
