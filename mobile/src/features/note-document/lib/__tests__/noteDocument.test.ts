import type { VoiceRecord } from '@/entities/record';

jest.mock('@/shared/lib', () => ({
  i18n: {
    language: 'en',
    t: (key: string) => {
      const labels: Record<string, string> = {
        'tasks.deadlineLabel': 'Deadline',
        'tasks.priorityLabel': 'Priority',
        'tasks.priority.high': 'High',
        'tasks.priority.medium': 'Medium',
        'tasks.priority.low': 'Low',
      };
      return labels[key] ?? key;
    },
  },
}));

jest.mock('@/features/share-record/lib/buildShareText', () => ({
  buildShareText: jest.fn((record: VoiceRecord, template: string) =>
    [
      `# ${record.title}`,
      '',
      '<!-- vi:section:tags -->',
      '## Tags',
      record.tags?.map((tag) => `#${tag}`).join(' ') ?? '',
      '<!-- vi:section:summary -->',
      '## Summary',
      record.summary ?? '',
      '<!-- vi:section:tasks -->',
      '## Tasks',
      ...(record.tasks ?? []).map((task) => `- [${task.isDone ? 'x' : ' '}] ${task.text}`),
      '<!-- vi:section:transcript -->',
      '## Transcript',
      record.transcript ?? '',
      template === 'meetingBrief' ? '<!-- vi:section:meeting-dialogue -->' : '',
    ].join('\n'),
  ),
}));

jest.mock('@/features/share-record/lib/shareExportContext', () => ({
  resolveShareExportContext: jest.fn((ctx?: object) => ctx ?? {}),
}));

import {
  buildNoteDocumentMarkdown,
  resolveNoteDocumentTemplate,
} from '../buildNoteDocumentMarkdown';
import {
  listNoteDocumentSectionIds,
  stripNoteDocumentMarkers,
} from '../noteDocumentSectionMarkers';
import {
  parseNoteDocumentMarkdown,
  parseTasksFromNoteDocumentMarkdown,
} from '../parseNoteDocumentMarkdown';
import { patchTaskDoneInNoteDocumentMarkdown } from '../patchTaskDoneInNoteDocumentMarkdown';
import { splitNoteDocumentAtTasksSection } from '../splitNoteDocumentAtTasksSection';

function makeRecord(overrides: Partial<VoiceRecord> = {}): VoiceRecord {
  return {
    id: 'rec_note_doc',
    title: 'Writing is telepathy',
    transcript: 'Ideas can travel through time and space.',
    transcriptSegments: [],
    summary: 'A short recap of the note.',
    tasks: [
      {
        id: 'rec_note_doc-task-0',
        text: 'Follow up with the team',
        isDone: false,
        priority: 'medium',
      },
    ],
    duration: '2:30',
    createdAt: '2026-06-01T10:00:00.000Z',
    status: 'read',
    isPinned: false,
    tags: ['evergreen'],
    nextSteps: ['Share the draft'],
    keyPhrases: ['telepathy'],
    ...overrides,
  };
}

describe('note document markdown', () => {
  it('builds a full document with section markers via share builder', () => {
    const markdown = buildNoteDocumentMarkdown(makeRecord());

    expect(markdown).toContain('# Writing is telepathy');
    expect(markdown).toContain('<!-- vi:section:summary -->');
    expect(markdown).toContain('<!-- vi:section:transcript -->');
    expect(listNoteDocumentSectionIds(markdown).has('tasks')).toBe(true);
  });

  it('strips section markers for reading view', () => {
    const markdown = buildNoteDocumentMarkdown(makeRecord());
    const stripped = stripNoteDocumentMarkers(markdown);

    expect(stripped).not.toContain('vi:section:');
    expect(stripped).toContain('# Writing is telepathy');
  });

  it('round-trips editable sections back into a patch', () => {
    const record = makeRecord();
    const markdown = buildNoteDocumentMarkdown(record);
    const edited = markdown
      .replace('Writing is telepathy', 'Writing is magic')
      .replace('A short recap of the note.', 'Updated summary body.')
      .replace('Ideas can travel through time and space.', 'Updated transcript body.')
      .replace('- [ ] Follow up with the team', '- [x] Follow up with the team')
      .replace('#evergreen', '#evergreen #ideas');

    const parsed = parseNoteDocumentMarkdown(edited, record);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.patch.title).toBe('Writing is magic');
    expect(parsed.patch.summary).toBe('Updated summary body.');
    expect(parsed.patch.transcript).toBe('Updated transcript body.');
    expect(parsed.patch.tags).toEqual(expect.arrayContaining(['evergreen', 'ideas']));
    expect(parsed.patch.tasks?.[0]?.isDone).toBe(true);
  });

  it('clears sections removed from the document', () => {
    const record = makeRecord();
    const markdown = buildNoteDocumentMarkdown(record);
    const withoutSummary = markdown.replace(
      /<!-- vi:section:summary -->[\s\S]*?(?=<!-- vi:section:|$)/,
      '',
    );

    const parsed = parseNoteDocumentMarkdown(withoutSummary, record);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.patch.summary).toBe('');
  });

  it('uses meeting brief template when note is a meeting', () => {
    expect(
      resolveNoteDocumentTemplate(
        makeRecord({
          classification: 'meeting',
          meetingDialogue: '**Speaker 1:** Hello team.',
        }),
      ),
    ).toBe('meetingBrief');
  });

  it('fails when title heading is missing', () => {
    const parsed = parseNoteDocumentMarkdown('No title here', makeRecord());
    expect(parsed.ok).toBe(false);
  });

  it('reads task done state from document markdown without saving', () => {
    const record = makeRecord();
    const markdown = buildNoteDocumentMarkdown(record);
    const toggled = markdown.replace(
      '- [ ] Follow up with the team',
      '- [x] Follow up with the team',
    );

    const tasks = parseTasksFromNoteDocumentMarkdown(toggled, record);
    expect(tasks[0]?.isDone).toBe(true);
    expect(record.tasks?.[0]?.isDone).toBe(false);
  });

  it('patches a task checkbox line in markdown', () => {
    const record = makeRecord();
    const markdown = buildNoteDocumentMarkdown(record);
    const task = record.tasks![0]!;

    const patched = patchTaskDoneInNoteDocumentMarkdown(markdown, task, true);
    expect(patched).toContain('- [x] Follow up with the team');
  });

  it('splits markdown around the tasks section', () => {
    const markdown = buildNoteDocumentMarkdown(makeRecord());
    const split = splitNoteDocumentAtTasksSection(markdown);

    expect(split).not.toBeNull();
    expect(split?.beforeMarkdown).toContain('# Writing is telepathy');
    expect(split?.afterMarkdown).toContain('## Transcript');
  });
});
