jest.mock('@/features/related-notes/lib/computeRecordSimilarity', () => ({
  buildSimilarityContext: () => ({ useEmbeddings: false, centroid: null }),
  computeRecordSimilarity: () => 0,
  MIN_HYBRID_SCORE: 0.35,
  MIN_LEXICAL_ONLY_SCORE: 0.08,
  shouldPrefilterSimilarityPair: () => false,
}));

import type { VoiceRecord } from '@/entities/record';

import {
  buildGraphModel,
  collectUniqueTags,
  countFilteredGraphRecords,
  countGraphNodes,
} from '../buildGraphModel';
import {
  DEFAULT_EDGE_VISIBILITY,
  DEFAULT_GRAPH_LAYOUT_MODE,
  type GraphFilters,
} from '../graphTypes';
import { recordNodeId, taskNodeId } from '../graphTypes';

function makeRecord(id: string, title: string, extras: Partial<VoiceRecord> = {}): VoiceRecord {
  return {
    id,
    title,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
    ...extras,
  };
}

const defaultFilters: GraphFilters = {
  folderId: null,
  tags: [],
  showTasks: true,
  showArchived: false,
  edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
  layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
};

describe('countFilteredGraphRecords', () => {
  it('filters by folder id', () => {
    const records = [
      makeRecord('a', 'A', { folderId: 'f1' }),
      makeRecord('b', 'B', { folderId: 'f2' }),
    ];

    expect(countFilteredGraphRecords(records, { ...defaultFilters, folderId: 'f1' })).toBe(1);
  });

  it('filters by tags case-insensitively', () => {
    const records = [
      makeRecord('a', 'A', { tags: ['Work'] }),
      makeRecord('b', 'B', { tags: ['personal'] }),
    ];

    expect(countFilteredGraphRecords(records, { ...defaultFilters, tags: ['work'] })).toBe(1);
  });

  it('excludes archived records unless showArchived is enabled', () => {
    const records = [
      makeRecord('a', 'A', { status: 'read' }),
      makeRecord('b', 'B', { status: 'archived' }),
    ];

    expect(countFilteredGraphRecords(records, defaultFilters)).toBe(1);
    expect(countFilteredGraphRecords(records, { ...defaultFilters, showArchived: true })).toBe(2);
  });
});

describe('countGraphNodes', () => {
  it('counts open tasks when showTasks is enabled', () => {
    const records = [
      makeRecord('a', 'A', {
        tasks: [
          { id: 't1', text: 'Open', isDone: false },
          { id: 't2', text: 'Done', isDone: true },
        ],
      }),
    ];

    expect(countGraphNodes(records, defaultFilters)).toBe(2);
    expect(countGraphNodes(records, { ...defaultFilters, showTasks: false })).toBe(1);
  });
});

describe('buildGraphModel', () => {
  it('creates record nodes with search text', () => {
    const model = buildGraphModel([makeRecord('a', 'Alpha Note')], defaultFilters);

    expect(model.recordCount).toBe(1);
    expect(model.nodes).toHaveLength(1);
    expect(model.nodes[0]).toMatchObject({
      id: recordNodeId('a'),
      kind: 'record',
      searchText: 'alpha note',
    });
  });

  it('creates task nodes and contains edges', () => {
    const model = buildGraphModel(
      [
        makeRecord('a', 'A', {
          tasks: [{ id: 't1', text: 'Buy milk', isDone: false }],
        }),
      ],
      defaultFilters,
    );

    expect(model.nodes).toHaveLength(2);
    expect(model.nodes.find((node) => node.id === taskNodeId('a', 't1'))).toMatchObject({
      kind: 'task',
      searchText: 'buy milk',
      parentRecordId: 'a',
    });
    expect(model.edges).toContainEqual({
      id: `contains:${taskNodeId('a', 't1')}`,
      kind: 'contains',
      sourceId: recordNodeId('a'),
      targetId: taskNodeId('a', 't1'),
    });
  });

  it('creates shared tag edges between tagged records', () => {
    const model = buildGraphModel(
      [makeRecord('a', 'A', { tags: ['work'] }), makeRecord('b', 'B', { tags: ['Work'] })],
      defaultFilters,
    );

    expect(model.edges).toContainEqual({
      id: 'tag:work:a|b',
      kind: 'sharedTag',
      sourceId: recordNodeId('a'),
      targetId: recordNodeId('b'),
      label: 'work',
    });
  });

  it('creates same-folder edges for small folder groups', () => {
    const model = buildGraphModel(
      [makeRecord('a', 'A', { folderId: 'f1' }), makeRecord('b', 'B', { folderId: 'f1' })],
      defaultFilters,
    );

    expect(model.edges).toContainEqual({
      id: 'folder:a|b',
      kind: 'sameFolder',
      sourceId: recordNodeId('a'),
      targetId: recordNodeId('b'),
    });
  });

  it('creates explicit linked edges between records', () => {
    const model = buildGraphModel(
      [
        makeRecord('a', 'A', { linkedRecordIds: ['b'] }),
        makeRecord('b', 'B'),
      ],
      defaultFilters,
    );

    expect(model.edges).toContainEqual({
      id: 'linked:a->b',
      kind: 'linked',
      sourceId: recordNodeId('a'),
      targetId: recordNodeId('b'),
    });
  });

  it('respects edge visibility flags', () => {
    const records = [
      makeRecord('a', 'A', { folderId: 'f1', tags: ['work'] }),
      makeRecord('b', 'B', { folderId: 'f1', tags: ['work'] }),
    ];
    const filters: GraphFilters = {
      ...defaultFilters,
      edgeVisibility: {
        similar: false,
        sharedTag: false,
        sameFolder: false,
        contains: false,
        linked: false,
      },
      showTasks: false,
    };

    const model = buildGraphModel(records, filters);

    expect(model.edges).toHaveLength(0);
  });
});

describe('collectUniqueTags', () => {
  it('deduplicates, trims, and sorts tags', () => {
    const tags = collectUniqueTags([
      makeRecord('a', 'A', { tags: [' beta ', 'Alpha'] }),
      makeRecord('b', 'B', { tags: ['alpha', ''] }),
    ]);

    expect(tags).toEqual(['Alpha', 'alpha', 'beta']);
  });
});
