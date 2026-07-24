import type { AppStats } from '../appStats';
import { buildAnalyticsSharePayload, formatAnalyticsTaskLine } from '../buildAnalyticsSharePayload';
import type { DeterministicDigest } from '../digest';

const labels = {
  title: 'Statistics',
  period: 'Period',
  dates: 'Dates',
  exported: 'Exported',
  sourceNote: 'Local data only.',
  overview: 'Overview',
  totalRecords: 'Recordings',
  totalDuration: 'Total time',
  aiProcessed: 'AI processed',
  tasksCompletion: 'Tasks done',
  activity: 'Activity',
  activityColumnLabel: 'Period',
  activityColumnCount: 'Notes',
  classification: 'Note types',
  classificationType: 'Type',
  classificationCount: 'Count',
  classificationShare: 'Share',
  topTags: 'Top tags',
  topicsTitle: 'Top topics',
  nextStepsTitle: 'Next steps',
  openTasksTitle: 'Open tasks',
  overdueTitle: 'Overdue tasks',
  empty: 'Nothing here yet.',
  class: {
    work: 'Work',
    meeting: 'Meeting',
    idea: 'Idea',
    personal: 'Personal',
    other: 'Other',
  },
};

const baseStats: AppStats = {
  total: 4,
  totalDurationMs: 120_000,
  totalMinutes: 2,
  aiPct: 50,
  tasksPct: 25,
  activityCounts: [1, 3],
  activityLabels: ['Mon', 'Tue'],
  classCounts: { work: 2, meeting: 1, idea: 0, personal: 1, other: 0 },
  topTags: [{ tag: 'project', count: 2 }],
};

const baseDigest: DeterministicDigest = {
  period: 'week',
  fromIso: '2026-06-08T00:00:00.000Z',
  toIso: '2026-06-14T23:59:59.999Z',
  records: [],
  recordCount: 4,
  totalDurationMs: 120_000,
  summaries: [],
  topKeyPhrases: [{ phrase: 'Planning', count: 2 }],
  openTasks: [
    {
      id: 't1',
      text: 'Ship feature',
      isDone: false,
      deadline: '2026-06-15',
      recordId: 'r1',
      recordTitle: 'Note',
    },
  ],
  overdueTasks: [],
  nextSteps: ['Review backlog'],
  classificationCounts: [],
};

describe('buildAnalyticsSharePayload', () => {
  it('builds markdown without AI digest content', () => {
    const { message, title } = buildAnalyticsSharePayload({
      periodLabel: 'Week',
      rangeText: '8 Jun – 14 Jun 2026',
      exportedAtText: '14 Jun 2026 15:30',
      stats: baseStats,
      digest: baseDigest,
      labels,
      formatDuration: () => '2 min',
    });

    expect(title).toBe('Statistics — Week');
    expect(message).toContain('# Statistics');
    expect(message).toContain('## Overview');
    expect(message).toContain('| Recordings | 4 |');
    expect(message).toContain('## Top topics');
    expect(message).toContain('- Planning ×2');
    expect(message).toContain('## Next steps');
    expect(message).toContain('- Review backlog');
    expect(message).toContain('## Open tasks');
    expect(message).not.toContain('AI recap');
  });

  it('includes overdue tasks section when present', () => {
    const { message } = buildAnalyticsSharePayload({
      periodLabel: 'Week',
      rangeText: '8 Jun – 14 Jun 2026',
      exportedAtText: '14 Jun 2026 15:30',
      stats: baseStats,
      digest: {
        ...baseDigest,
        overdueTasks: [
          {
            id: 't2',
            text: 'Late task',
            isDone: false,
            deadline: '2026-06-01',
            recordId: 'r2',
            recordTitle: 'Note 2',
          },
        ],
      },
      labels,
      formatDuration: () => '2 min',
    });

    expect(message).toContain('## Overdue tasks');
    expect(message).toContain('- Late task');
  });
});

describe('formatAnalyticsTaskLine', () => {
  it('appends deadline when present', () => {
    expect(
      formatAnalyticsTaskLine({
        id: 't1',
        text: 'Call client',
        isDone: false,
        deadline: '2026-06-14',
        recordId: 'r1',
        recordTitle: 'Note',
      }),
    ).toContain('Call client');
  });
});
