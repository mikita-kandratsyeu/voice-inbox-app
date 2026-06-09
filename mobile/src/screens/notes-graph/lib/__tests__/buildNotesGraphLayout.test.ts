jest.mock('@/features/related-notes/lib/computeRecordSimilarity', () => ({
  buildSimilarityContext: () => ({ useEmbeddings: false, centroid: null }),
  computeRecordSimilarity: () => 0,
  MIN_HYBRID_SCORE: 0.35,
  MIN_LEXICAL_ONLY_SCORE: 0.08,
  shouldPrefilterSimilarityPair: () => false,
}));

import type { VoiceRecord } from '@/entities/record';

import { buildNotesGraphLayout } from '../buildNotesGraphLayout';
import { clearGraphSessionLayout } from '../graphSessionLayout';
import { DEFAULT_EDGE_VISIBILITY, DEFAULT_GRAPH_LAYOUT_MODE } from '../graphTypes';
import { recordNodeId } from '../graphTypes';

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

const filters = {
  folderId: null,
  tags: [] as string[],
  showTasks: false,
  edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY, contains: false },
  layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
};

describe('buildNotesGraphLayout', () => {
  beforeEach(() => {
    clearGraphSessionLayout();
  });

  it('returns laid-out nodes, edges, graph size, and search index', () => {
    const records = [makeRecord('a', 'Alpha'), makeRecord('b', 'Beta')];
    const result = buildNotesGraphLayout(records, filters, 2, null, 390, 800);

    expect(result.recordCount).toBe(2);
    expect(result.layoutNodes).toHaveLength(2);
    expect(result.layoutEdges.length).toBeGreaterThanOrEqual(0);
    expect(result.graphSize.width).toBeGreaterThan(0);
    expect(result.graphSize.height).toBeGreaterThan(0);
    expect(result.searchIndex).toEqual([
      { id: recordNodeId('a'), searchText: 'alpha' },
      { id: recordNodeId('b'), searchText: 'beta' },
    ]);
  });

  it('applies simplify mode for large filtered record counts', () => {
    const records = [makeRecord('a', 'Alpha')];
    const fullTasks = {
      ...filters,
      showTasks: true,
      edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
    };
    const simplified = buildNotesGraphLayout(records, fullTasks, 200, null, 390, 800);

    expect(simplified.layoutNodes.every((node) => node.kind === 'record')).toBe(true);
    expect(simplified.layoutEdges.every((edge) => edge.kind !== 'contains')).toBe(true);
  });
});
