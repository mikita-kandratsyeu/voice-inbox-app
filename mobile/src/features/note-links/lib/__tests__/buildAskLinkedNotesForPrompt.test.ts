import type { VoiceRecord } from '@/entities/record';

import { buildAskLinkedNotesForPrompt } from '../buildAskLinkedNotesForPrompt';

const makeRecord = (id: string, title: string, patch: Partial<VoiceRecord> = {}): VoiceRecord =>
  ({
    id,
    title,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
    ...patch,
  }) as VoiceRecord;

describe('buildAskLinkedNotesForPrompt', () => {
  it('returns linked notes with summary and tasks', () => {
    const source = makeRecord('main', 'Main', { linkedRecordIds: ['linked'] });
    const linked = makeRecord('linked', 'Linked note', {
      summary: 'Linked summary',
      tasks: [{ id: 't1', text: 'Follow up', isDone: false }],
      transcript: 'Long transcript that should not be used when summary exists',
    });
    const byId = new Map([
      ['main', source],
      ['linked', linked],
    ]);

    expect(buildAskLinkedNotesForPrompt(source, byId)).toEqual([
      {
        title: 'Linked note',
        summary: 'Linked summary',
        tasks: [{ text: 'Follow up' }],
      },
    ]);
  });

  it('uses transcript excerpt when summary is missing', () => {
    const source = makeRecord('main', 'Main', { linkedRecordIds: ['linked'] });
    const linked = makeRecord('linked', 'Linked note', {
      transcript: 'Only transcript context here',
    });
    const byId = new Map([['linked', linked]]);

    expect(buildAskLinkedNotesForPrompt(source, byId)).toEqual([
      {
        title: 'Linked note',
        transcriptExcerpt: 'Only transcript context here',
      },
    ]);
  });

  it('skips self-links, missing records, and empty notes', () => {
    const source = makeRecord('main', 'Main', {
      linkedRecordIds: ['main', 'missing', 'empty'],
    });
    const empty = makeRecord('empty', 'Empty note');
    const byId = new Map([['empty', empty]]);

    expect(buildAskLinkedNotesForPrompt(source, byId)).toBeUndefined();
  });
});
