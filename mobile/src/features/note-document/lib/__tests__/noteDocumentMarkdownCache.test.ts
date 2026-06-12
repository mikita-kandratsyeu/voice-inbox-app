import type { VoiceRecord } from '@/entities/record';

import { buildNoteDocumentCacheKey } from '../noteDocumentCacheKey';
import {
  clearNoteDocumentMarkdownCacheForTests,
  getCachedNoteDocumentMarkdown,
  setCachedNoteDocumentMarkdown,
} from '../noteDocumentMarkdownStore';

function makeRecord(overrides: Partial<VoiceRecord> = {}): VoiceRecord {
  return {
    id: 'rec-1',
    title: 'Title',
    createdAt: '2026-01-01T00:00:00.000Z',
    durationMs: 1000,
    status: 'ready',
    transcript: 'Hello world',
    ...overrides,
  } as VoiceRecord;
}

const emptyCtx = { folderNameById: {} };

describe('noteDocumentCacheKey', () => {
  it('builds stable cache keys for the same record content', () => {
    const record = makeRecord();
    const keyA = buildNoteDocumentCacheKey(record, 'en', emptyCtx);
    const keyB = buildNoteDocumentCacheKey(record, 'en', emptyCtx);
    expect(keyA).toBe(keyB);
  });

  it('changes cache key when transcript changes', () => {
    const base = makeRecord();
    const updated = makeRecord({ transcript: 'Updated transcript' });
    const baseKey = buildNoteDocumentCacheKey(base, 'en', emptyCtx);
    const updatedKey = buildNoteDocumentCacheKey(updated, 'en', emptyCtx);
    expect(baseKey).not.toBe(updatedKey);
  });
});

describe('noteDocumentMarkdownStore', () => {
  afterEach(() => {
    clearNoteDocumentMarkdownCacheForTests();
  });

  it('stores and retrieves cached markdown', () => {
    const record = makeRecord();
    const key = buildNoteDocumentCacheKey(record, 'en', emptyCtx);
    setCachedNoteDocumentMarkdown(key, '# Title\n\nBody');
    expect(getCachedNoteDocumentMarkdown(key)).toBe('# Title\n\nBody');
  });
});
