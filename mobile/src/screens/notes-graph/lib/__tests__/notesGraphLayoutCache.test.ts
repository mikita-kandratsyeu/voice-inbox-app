jest.mock('@/features/related-notes/lib/computeRecordSimilarity', () => ({
  buildSimilarityContext: () => ({ useEmbeddings: false, centroid: null }),
  computeRecordSimilarity: () => 0,
  MIN_HYBRID_SCORE: 0.35,
  MIN_LEXICAL_ONLY_SCORE: 0.08,
  shouldPrefilterSimilarityPair: () => false,
}));

import type { VoiceRecord } from '@/entities/record';

import { clearGraphSessionLayout } from '../graphSessionLayout';
import {
  awaitPendingNotesGraphLayout,
  buildAndCacheNotesGraphLayout,
  buildNotesGraphLayoutCacheKey,
  clearNotesGraphLayoutCache,
  DEFAULT_NOTES_GRAPH_FILTERS,
  getCachedNotesGraphLayout,
  warmNotesGraphLayoutDebounced,
  warmNotesGraphLayoutWithFilters,
} from '../notesGraphLayoutCache';
import { buildNotesGraphRecordsRevision } from '../notesGraphRecordsRevision';

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
  ...DEFAULT_NOTES_GRAPH_FILTERS,
  showTasks: false,
  showCompletedTasks: false,
};

describe('notesGraphLayoutCache', () => {
  beforeEach(() => {
    clearNotesGraphLayoutCache();
    clearGraphSessionLayout();
    jest.useRealTimers();
  });

  it('builds a cache key from records, filters, viewport, and count', () => {
    const records = [makeRecord('b', 'B'), makeRecord('a', 'A')];
    const key = buildNotesGraphLayoutCacheKey(records, filters, null, 390.4, 800.6);

    expect(key).toContain(buildNotesGraphRecordsRevision(records));
    expect(key).toContain('390;801');
    expect(key.endsWith(';2')).toBe(true);
  });

  it('includes layout mode in the cache key', () => {
    const records = [makeRecord('a', 'A')];
    const forceKey = buildNotesGraphLayoutCacheKey(records, filters, null, 390, 800);
    const circularKey = buildNotesGraphLayoutCacheKey(
      records,
      { ...filters, layoutMode: 'circular' },
      null,
      390,
      800,
    );

    expect(forceKey).not.toBe(circularKey);
    expect(forceKey).toContain(';force;');
    expect(circularKey).toContain(';circular;');
  });

  it('returns cached layout for the same key', () => {
    const records = [makeRecord('a', 'Alpha'), makeRecord('b', 'Beta')];
    const first = buildAndCacheNotesGraphLayout(records, filters, 2, null, 390, 800);
    const second = buildAndCacheNotesGraphLayout(records, filters, 2, null, 390, 800);

    expect(second).toBe(first);
    expect(
      getCachedNotesGraphLayout(buildNotesGraphLayoutCacheKey(records, filters, null, 390, 800)),
    ).toBe(first);
  });

  it('rebuilds after cache clear', () => {
    const records = [makeRecord('a', 'Alpha')];
    const first = buildAndCacheNotesGraphLayout(records, filters, 1, null, 390, 800);
    clearNotesGraphLayoutCache();
    const second = buildAndCacheNotesGraphLayout(records, filters, 1, null, 390, 800);

    expect(second).not.toBe(first);
    expect(second.layoutNodes).toHaveLength(1);
  });

  it('warms layout asynchronously and resolves pending promise', async () => {
    const records = [makeRecord('a', 'Alpha'), makeRecord('b', 'Beta')];
    const key = buildNotesGraphLayoutCacheKey(records, filters, null, 390, 800);

    warmNotesGraphLayoutWithFilters(records, filters, null, 390, 800);

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
    const warmed = await awaitPendingNotesGraphLayout(key);
    expect(warmed?.layoutNodes).toHaveLength(2);
    expect(getCachedNotesGraphLayout(key)).toBe(warmed);
  });

  it('debounces immediate warm with default filters', async () => {
    jest.useFakeTimers();
    const records = [makeRecord('a', 'Alpha')];
    const key = buildNotesGraphLayoutCacheKey(records, DEFAULT_NOTES_GRAPH_FILTERS, null, 390, 800);

    warmNotesGraphLayoutDebounced(records, 390, 800, 400);
    warmNotesGraphLayoutDebounced(records, 390, 800, 400);

    jest.advanceTimersByTime(399);
    expect(getCachedNotesGraphLayout(key)).toBeNull();

    jest.advanceTimersByTime(400);
    jest.advanceTimersByTime(0);
    jest.useRealTimers();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));

    const warmed = await awaitPendingNotesGraphLayout(key);
    expect(warmed?.layoutNodes).toHaveLength(1);
    expect(getCachedNotesGraphLayout(key)).toBe(warmed);
  });
});
