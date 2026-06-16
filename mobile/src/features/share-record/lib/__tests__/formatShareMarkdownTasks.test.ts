jest.mock('@/shared/lib', () => ({
  i18n: {
    t: (key: string) => {
      const labels: Record<string, string> = {
        'taskOutcome.resultLabel': 'Result',
        'taskOutcome.followUpSectionTitle': 'Linked note',
      };
      return labels[key] ?? key;
    },
  },
}));

import { formatTaskLinesForShare } from '../formatShareMarkdown';

describe('formatTaskLinesForShare', () => {
  it('appends an indented outcome sub-line', () => {
    const lines = formatTaskLinesForShare(
      {
        id: 'task-1',
        text: 'Confirm launch date',
        isDone: true,
        outcomeText: 'Launch moved to July',
      },
      ' (Priority: Medium)',
    );

    expect(lines).toEqual([
      '- [x] Confirm launch date (Priority: Medium)',
      '  - **Result:** Launch moved to July',
    ]);
  });

  it('appends linked follow-up note as a wiki link when record id is provided', () => {
    const lines = formatTaskLinesForShare(
      {
        id: 'task-1',
        text: 'Send recap',
        isDone: true,
        outcomeRecordId: 'rec_follow',
      },
      '',
      { followUpTitle: 'Follow-up recap note', followUpRecordId: 'rec_follow' },
    );

    expect(lines).toEqual([
      '- [x] Send recap',
      '  - **Linked note:** [[rec_follow|Follow-up recap note]]',
    ]);
  });

  it('falls back to plain follow-up title when record id is missing', () => {
    const lines = formatTaskLinesForShare(
      {
        id: 'task-1',
        text: 'Send recap',
        isDone: true,
      },
      '',
      { followUpTitle: 'Follow-up recap note' },
    );

    expect(lines).toEqual(['- [x] Send recap', '  - **Linked note:** Follow-up recap note']);
  });
});
