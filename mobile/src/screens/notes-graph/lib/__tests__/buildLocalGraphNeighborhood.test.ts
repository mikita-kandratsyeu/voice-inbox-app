jest.mock('@/features/related-notes/lib/computeRecordSimilarity', () => ({
  __esModule: true,
  buildSimilarityContext: () => ({ useEmbeddings: false, centroid: null }),
  MIN_HYBRID_SCORE: 0.35,
  MIN_LEXICAL_ONLY_SCORE: 0.08,
  rankSimilarRecords: jest.fn(() => [] as { id: string }[]),
}));

const { rankSimilarRecords: mockRankSimilarRecords } = jest.requireMock(
  '@/features/related-notes/lib/computeRecordSimilarity',
) as {
  rankSimilarRecords: jest.Mock;
};

import type { VoiceRecord } from '@/entities/record';

import { buildLocalGraphNeighborhood } from '../buildLocalGraphNeighborhood';

function makeRecord(
  id: string,
  linkedRecordIds?: string[],
  overrides: Partial<VoiceRecord> = {},
): VoiceRecord {
  return {
    id,
    title: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
    linkedRecordIds,
    ...overrides,
  } as VoiceRecord;
}

describe('buildLocalGraphNeighborhood', () => {
  beforeEach(() => {
    mockRankSimilarRecords.mockReset();
    mockRankSimilarRecords.mockReturnValue([]);
  });

  it('returns only the center when there are no neighbors', () => {
    const records = [makeRecord('center')];

    const neighborhood = buildLocalGraphNeighborhood('center', records, {
      maxHops: 2,
      includeSimilar: false,
    });

    expect(neighborhood.recordIds).toEqual(['center']);
    expect(neighborhood.edges).toEqual([]);
  });

  it('collects linked and backlink neighbors at hop 1', () => {
    const records = [
      makeRecord('center', ['b']),
      makeRecord('b', ['center']),
      makeRecord('c', ['center']),
    ];

    const neighborhood = buildLocalGraphNeighborhood('center', records, {
      maxHops: 1,
      includeSimilar: false,
    });

    expect(neighborhood.recordIds).toEqual(expect.arrayContaining(['center', 'b', 'c']));
    expect(neighborhood.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceRecordId: 'center',
          targetRecordId: 'b',
          kind: 'linked',
          hop: 1,
        }),
        expect.objectContaining({
          sourceRecordId: 'center',
          targetRecordId: 'c',
          kind: 'linked',
          hop: 1,
        }),
      ]),
    );
  });

  it('expands to hop 2 through linked notes only', () => {
    const records = [
      makeRecord('center', ['b']),
      makeRecord('b', ['center', 'c']),
      makeRecord('c'),
    ];

    const neighborhood = buildLocalGraphNeighborhood('center', records, {
      maxHops: 2,
      includeSimilar: false,
    });

    expect(neighborhood.recordIds).toEqual(expect.arrayContaining(['center', 'b', 'c']));
    expect(neighborhood.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceRecordId: 'b', targetRecordId: 'c', hop: 2 }),
      ]),
    );
  });

  it('adds similar neighbors only at hop 1 from the center', () => {
    const records = [makeRecord('center'), makeRecord('similar'), makeRecord('far')];

    mockRankSimilarRecords.mockReturnValue([records[1]!]);

    const neighborhood = buildLocalGraphNeighborhood('center', records, {
      maxHops: 2,
      includeSimilar: true,
      similarLimitPerHop: 2,
    });

    expect(neighborhood.recordIds).toEqual(expect.arrayContaining(['center', 'similar']));
    expect(neighborhood.recordIds).not.toContain('far');
    expect(neighborhood.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceRecordId: 'center',
          targetRecordId: 'similar',
          kind: 'similar',
          hop: 1,
        }),
      ]),
    );
  });
});
