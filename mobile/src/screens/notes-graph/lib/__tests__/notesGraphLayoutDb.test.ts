jest.mock('@/shared/lib', () => ({
  isRecord: (value: unknown) => typeof value === 'object' && value !== null,
  isString: (value: unknown) => typeof value === 'string',
  notesGraphLayoutVersionTable: {},
  waitForDb: jest.fn(),
}));

import {
  deserializeNotesGraphPositions,
  serializeNotesGraphPositions,
} from '../notesGraphLayoutDb';

describe('notesGraphLayoutDb position serialization', () => {
  it('serializes positions in sorted node-id order', () => {
    const serialized = serializeNotesGraphPositions(
      new Map([
        ['record:b', { x: 2, y: 3 }],
        ['record:a', { x: 10, y: 20 }],
      ]),
    );

    expect(JSON.parse(serialized)).toEqual([
      ['record:a', { x: 10, y: 20 }],
      ['record:b', { x: 2, y: 3 }],
    ]);
  });

  it('deserializes stored positions', () => {
    const serialized = JSON.stringify([
      ['record:a', { x: 1, y: 2 }],
      ['record:b', { x: 3, y: 4 }],
    ]);

    expect(deserializeNotesGraphPositions(serialized)).toEqual({
      'record:a': { x: 1, y: 2 },
      'record:b': { x: 3, y: 4 },
    });
  });

  it('returns empty object for empty serialized value', () => {
    expect(deserializeNotesGraphPositions('')).toEqual({});
  });
});
