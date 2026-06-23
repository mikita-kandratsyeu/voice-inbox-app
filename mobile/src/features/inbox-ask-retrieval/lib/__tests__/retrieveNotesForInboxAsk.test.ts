jest.mock('@/shared/lib/embeddings', () => {
  const cosineSimilarity = (a: number[], b: number[]) => {
    const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
    const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
    const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
    return normA && normB ? dot / (normA * normB) : 0;
  };
  const centerEmbedding = (vector: number[], centroid: number[]) =>
    vector.map((value, index) => value - (centroid[index] ?? 0));

  return {
    centeredCosineSimilarity: (a: number[], b: number[], centroid: number[]) =>
      cosineSimilarity(centerEmbedding(a, centroid), centerEmbedding(b, centroid)),
    computeCentroid: (embeddings: number[][]) => {
      if (embeddings.length === 0) return [];
      const dim = embeddings[0]?.length ?? 0;
      return Array.from(
        { length: dim },
        (_, index) =>
          embeddings.reduce((sum, embedding) => sum + (embedding[index] ?? 0), 0) /
          embeddings.length,
      );
    },
    generateEmbedding: jest.fn(async () => []),
    getEmbeddingLanguage: jest.fn(() => 'en'),
    isEmbeddingAvailable: jest.fn(() => false),
    prepareEmbeddingModel: jest.fn(async () => undefined),
  };
});

import type { VoiceRecord } from '@/entities/record';

import {
  countInboxAskCorpusRecords,
  filterInboxAskCorpusRecords,
  INBOX_ASK_RETRIEVAL_TOP_K,
  retrieveNotesForInboxAsk,
} from '../retrieveNotesForInboxAsk';

const makeRecord = (id: string, title: string, patch: Partial<VoiceRecord> = {}): VoiceRecord =>
  ({
    id,
    title,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
    ...patch,
  }) as VoiceRecord;

describe('filterInboxAskCorpusRecords', () => {
  const active = makeRecord('a', 'Active', { status: 'read' });
  const archived = makeRecord('arch', 'Archived', { status: 'archived' });
  const folderA = makeRecord('fa', 'Folder A', { folderId: 'folder-a' });
  const folderB = makeRecord('fb', 'Folder B', { folderId: 'folder-b' });
  const oldNote = makeRecord('old', 'Old', { createdAt: '2025-01-01T00:00:00.000Z' });
  const newNote = makeRecord('new', 'New', { createdAt: '2026-06-01T00:00:00.000Z' });

  it('excludes archived notes by default', () => {
    expect(filterInboxAskCorpusRecords([active, archived])).toEqual([active]);
  });

  it('includes archived notes when includeArchived is true', () => {
    expect(filterInboxAskCorpusRecords([active, archived], { includeArchived: true })).toEqual([
      active,
      archived,
    ]);
  });

  it('filters by folderId', () => {
    expect(filterInboxAskCorpusRecords([folderA, folderB], { folderId: 'folder-a' })).toEqual([
      folderA,
    ]);
  });

  it('filters by date range', () => {
    const records = [oldNote, newNote];
    expect(
      filterInboxAskCorpusRecords(records, {
        fromIso: '2026-01-01T00:00:00.000Z',
        toIso: '2026-12-31T23:59:59.999Z',
      }),
    ).toEqual([newNote]);
  });

  it('countInboxAskCorpusRecords mirrors filter length', () => {
    expect(countInboxAskCorpusRecords([active, archived, folderA], { folderId: 'folder-a' })).toBe(
      1,
    );
  });
});

describe('retrieveNotesForInboxAsk', () => {
  it('ranks lexical matches by relevance fields', () => {
    const titleHit = makeRecord('title', 'Budget planning', {
      summary: 'Planning session',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const summaryHit = makeRecord('summary', 'Weekly sync', {
      summary: 'Discussed budget constraints for Q2',
      createdAt: '2026-06-01T00:00:00.000Z',
    });

    const result = retrieveNotesForInboxAsk({
      question: 'budget',
      records: [summaryHit, titleHit],
      embeddingsById: new Map(),
    });

    expect(result.retrievalMode).toBe('lexical');
    expect(result.candidates[0]?.recordId).toBe('title');
    expect(result.notes[0]?.recordId).toBe('title');
    expect(result.notes.some((note) => note.recordId === 'summary')).toBe(true);
  });

  it('excludes archived notes from retrieval unless scope allows them', () => {
    const active = makeRecord('active', 'Budget review', { summary: 'budget update' });
    const archived = makeRecord('archived', 'Budget archive', {
      status: 'archived',
      summary: 'budget history',
    });

    const withoutArchive = retrieveNotesForInboxAsk({
      question: 'budget',
      records: [active, archived],
      embeddingsById: new Map(),
    });
    expect(withoutArchive.notes.map((note) => note.recordId)).toEqual(['active']);

    const withArchive = retrieveNotesForInboxAsk({
      question: 'budget',
      records: [active, archived],
      embeddingsById: new Map(),
      scope: { includeArchived: true },
    });
    expect(withArchive.notes.map((note) => note.recordId).sort()).toEqual(['active', 'archived']);
  });

  it('ranks transcript-only lexical matches into retrieval results', () => {
    const transcriptHit = makeRecord('transcript', 'Weekly sync', {
      summary: 'General meeting notes',
      transcript: 'We discussed the quarterly budget allocation in detail.',
    });
    const unrelated = makeRecord('other', 'Garden plans', {
      summary: 'Planting schedule',
      transcript: 'Tomatoes and herbs for the patio.',
    });

    const result = retrieveNotesForInboxAsk({
      question: 'budget',
      records: [unrelated, transcriptHit],
      embeddingsById: new Map(),
    });

    expect(result.retrievalMode).toBe('lexical');
    expect(result.notes.some((note) => note.recordId === 'transcript')).toBe(true);
    expect(result.notes.every((note) => note.recordId !== 'other')).toBe(true);
  });

  it('returns empty notes when nothing matches lexically', () => {
    const older = makeRecord('old', 'Alpha', {
      summary: 'Older note',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    const newer = makeRecord('new', 'Beta', {
      summary: 'Newer note',
      createdAt: '2026-06-01T00:00:00.000Z',
    });

    const result = retrieveNotesForInboxAsk({
      question: 'zzzznonexistent',
      records: [older, newer],
      embeddingsById: new Map(),
    });

    expect(result.retrievalMode).toBe('lexical');
    expect(result.candidates).toHaveLength(0);
    expect(result.notes).toHaveLength(0);
    expect(result.totalCorpusCount).toBe(2);
  });

  it('keeps final packed notes within max notes even with a wider pre-pack pool', () => {
    const records = Array.from({ length: INBOX_ASK_RETRIEVAL_TOP_K + 5 }, (_, index) =>
      makeRecord(`note-${index}`, `Budget note ${index}`, {
        summary: `Budget topic ${index}`,
      }),
    );

    const result = retrieveNotesForInboxAsk({
      question: 'budget',
      records,
      embeddingsById: new Map(),
    });

    expect(result.candidates.length).toBeLessThanOrEqual(INBOX_ASK_RETRIEVAL_TOP_K);
    expect(result.notes.length).toBeLessThanOrEqual(8);
  });

  it('uses hybrid ranking when query and note embeddings are available', () => {
    const semanticMatch = makeRecord('match', 'Unrelated title', {
      summary: 'No keyword overlap here',
    });
    const lexicalMatch = makeRecord('lex', 'Budget keyword note', {
      summary: 'budget details',
    });
    const queryEmbedding = [1, 0];
    const embeddingsById = new Map<string, number[]>([
      ['match', [0.95, 0.05]],
      ['lex', [0, 1]],
    ]);

    const result = retrieveNotesForInboxAsk({
      question: 'quantum',
      records: [lexicalMatch, semanticMatch],
      embeddingsById,
      queryEmbedding,
    });

    expect(result.retrievalMode).toBe('hybrid');
    expect(result.candidates[0]?.recordId).toBe('match');
    expect(result.notes[0]?.recordId).toBe('match');
  });
});
