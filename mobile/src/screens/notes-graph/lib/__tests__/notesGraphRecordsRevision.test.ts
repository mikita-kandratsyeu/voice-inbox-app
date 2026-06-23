jest.mock('@/features/related-notes/lib/computeRecordSimilarity', () => ({
  buildSimilarityContext: () => ({ useEmbeddings: false, centroid: null }),
  computeRecordSimilarity: () => 0,
  MIN_HYBRID_SCORE: 0.35,
  MIN_LEXICAL_ONLY_SCORE: 0.08,
  shouldPrefilterSimilarityPair: () => false,
}));

import type { VoiceRecord } from '@/entities/record';

import { buildNotesGraphPersistKey } from '../buildNotesGraphPersistKey';
import {
  DEFAULT_EDGE_VISIBILITY,
  DEFAULT_GRAPH_LAYOUT_MODE,
  DEFAULT_NODE_DISPLAY_MODE,
  type GraphFilters,
} from '../graphTypes';
import {
  buildNotesGraphLayoutCacheKey,
  DEFAULT_NOTES_GRAPH_FILTERS,
} from '../notesGraphLayoutCache';
import { buildNotesGraphRecordsRevision } from '../notesGraphRecordsRevision';

function makeRecord(id: string, overrides: Partial<VoiceRecord> = {}): VoiceRecord {
  return {
    id,
    title: `Title ${id}`,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
    ...overrides,
  };
}

const filters: GraphFilters = {
  folderIds: [],
  tags: [],
  showTasks: false,
  showCompletedTasks: false,
  showArchived: false,
  edgeVisibility: {
    ...DEFAULT_EDGE_VISIBILITY,
    contains: false,
    sharedTag: false,
  },
  layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
  nodeDisplayMode: DEFAULT_NODE_DISPLAY_MODE,
};

describe('buildNotesGraphRecordsRevision', () => {
  it('returns 0 for an empty library', () => {
    expect(buildNotesGraphRecordsRevision([])).toBe('0');
  });

  it('is stable regardless of record order', () => {
    const a = makeRecord('a');
    const b = makeRecord('b');

    expect(buildNotesGraphRecordsRevision([a, b])).toBe(buildNotesGraphRecordsRevision([b, a]));
  });

  it.each([
    ['title', { title: 'Renamed note' }],
    ['tags', { tags: ['work'] }],
    ['links', { linkedRecordIds: ['other'] }],
    [
      'tasks',
      {
        tasks: [
          {
            id: 'task-1',
            text: 'Follow up',
            isDone: false,
          },
        ],
      },
    ],
    ['summary', { summary: 'New summary' }],
    ['transcript length', { transcript: 'Longer transcript text' }],
    ['folder', { folderId: 'folder-1' }],
    ['status', { status: 'archived' as const }],
  ])('changes when %s changes', (_label, patch) => {
    const before = makeRecord('a');
    const after = makeRecord('a', patch);

    expect(buildNotesGraphRecordsRevision([before])).not.toBe(
      buildNotesGraphRecordsRevision([after]),
    );
  });

  it('changes cache and persist keys when graph-relevant content changes', () => {
    const before = [makeRecord('a'), makeRecord('b')];
    const after = [makeRecord('a'), makeRecord('b', { tags: ['ideas'] })];

    const beforeCacheKey = buildNotesGraphLayoutCacheKey(
      before,
      DEFAULT_NOTES_GRAPH_FILTERS,
      null,
      390,
      800,
    );
    const afterCacheKey = buildNotesGraphLayoutCacheKey(
      after,
      DEFAULT_NOTES_GRAPH_FILTERS,
      null,
      390,
      800,
    );

    expect(afterCacheKey).not.toBe(beforeCacheKey);

    const beforePersistKey = buildNotesGraphPersistKey(before, filters, null);
    const afterPersistKey = buildNotesGraphPersistKey(after, filters, null);

    expect(afterPersistKey).not.toBe(beforePersistKey);
  });
});
