import type { VoiceRecord } from '@/entities/record';

import type { GraphNode } from '../graphTypes';
import { recordNodeId } from '../graphTypes';
import { graphNodeSearchText } from '../graphNodeSearchText';
import { buildGraphSearchIndex, findGraphSearchMatchIds } from '../graphSearch';

function makeRecord(id: string, title: string): VoiceRecord {
  return {
    id,
    title,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
  };
}

function makeRecordNode(record: VoiceRecord): GraphNode {
  return {
    id: recordNodeId(record.id),
    kind: 'record',
    x: 0,
    y: 0,
    searchText: graphNodeSearchText({ kind: 'record', record }),
    record,
  };
}

describe('buildGraphSearchIndex', () => {
  it('maps node ids to precomputed search text', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'Alpha note')),
      makeRecordNode(makeRecord('b', 'Beta draft')),
    ];

    expect(buildGraphSearchIndex(nodes)).toEqual([
      { id: recordNodeId('a'), searchText: 'alpha note' },
      { id: recordNodeId('b'), searchText: 'beta draft' },
    ]);
  });
});

describe('findGraphSearchMatchIds', () => {
  it('returns ids of nodes matching query', () => {
    const index = buildGraphSearchIndex([
      makeRecordNode(makeRecord('a', 'Alpha note')),
      makeRecordNode(makeRecord('b', 'Beta draft')),
      makeRecordNode(makeRecord('c', 'Gamma')),
    ]);

    expect(findGraphSearchMatchIds(index, 'alpha')).toEqual([recordNodeId('a')]);
    expect(findGraphSearchMatchIds(index, 'ta')).toEqual([recordNodeId('b')]);
  });
});
