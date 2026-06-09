jest.mock('@/features/related-notes/lib/computeRecordSimilarity', () => ({
  buildSimilarityContext: () => ({ useEmbeddings: false, centroid: null }),
  computeRecordSimilarity: () => 0,
  MIN_HYBRID_SCORE: 0.35,
  MIN_LEXICAL_ONLY_SCORE: 0.08,
  shouldPrefilterSimilarityPair: () => false,
}));

import type { VoiceRecord } from '@/entities/record';

import { buildNotesGraphPersistKey } from '../buildNotesGraphPersistKey';
import { DEFAULT_EDGE_VISIBILITY, type GraphFilters } from '../graphTypes';
import { parseNotesGraphPersistKey } from '../parseNotesGraphPersistKey';

function makeRecord(id: string): VoiceRecord {
  return {
    id,
    title: id,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
  };
}

const filters: GraphFilters = {
  folderId: null,
  tags: [],
  showTasks: false,
  edgeVisibility: {
    ...DEFAULT_EDGE_VISIBILITY,
    contains: false,
    sharedTag: false,
  },
};

describe('buildNotesGraphPersistKey', () => {
  it('builds a stable key that round-trips through parseNotesGraphPersistKey', () => {
    const records = [makeRecord('b'), makeRecord('a')];
    const key = buildNotesGraphPersistKey(records, filters, null);
    const parsed = parseNotesGraphPersistKey(key);

    expect(parsed).not.toBeNull();
    expect(parsed?.recordsRevision).toBe('2:a,b');
    expect(parsed?.folderId).toBeNull();
    expect(parsed?.tags).toEqual([]);
    expect(parsed?.showTasks).toBe(false);
    expect(parsed?.simplifyOverride).toBeNull();
    expect(parsed?.filteredCount).toBe(2);
    expect(parsed?.edgeVisibility).toEqual(filters.edgeVisibility);
  });

  it('encodes explicit simplify override', () => {
    const key = buildNotesGraphPersistKey([makeRecord('a')], filters, true);

    expect(parseNotesGraphPersistKey(key)?.simplifyOverride).toBe(true);
  });
});
