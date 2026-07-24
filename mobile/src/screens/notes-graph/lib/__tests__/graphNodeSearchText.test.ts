import type { VoiceRecord } from '@/entities/record';

import { graphNodeSearchText } from '../graphNodeSearchText';

function makeRecord(title: string): VoiceRecord {
  return {
    id: 'r1',
    title,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
  };
}

describe('graphNodeSearchText', () => {
  it('lowercases record titles', () => {
    expect(graphNodeSearchText({ kind: 'record', record: makeRecord('Alpha Note') })).toBe(
      'alpha note',
    );
  });

  it('lowercases task text', () => {
    expect(
      graphNodeSearchText({
        kind: 'task',
        task: { id: 't1', text: 'Buy Milk', isDone: false },
      }),
    ).toBe('buy milk');
  });

  it('returns empty string when payload is missing', () => {
    expect(graphNodeSearchText({ kind: 'record' })).toBe('');
    expect(graphNodeSearchText({ kind: 'task' })).toBe('');
  });
});
