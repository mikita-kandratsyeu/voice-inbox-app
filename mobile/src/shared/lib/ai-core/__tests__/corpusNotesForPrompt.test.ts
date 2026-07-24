import {
  type CorpusNoteCandidate,
  INBOX_ASK_MAX_NOTES,
  packCorpusNotesForPrompt,
  queryAwareTranscriptExcerpt,
  TRANSCRIPT_EXCERPT_MAX,
} from '../corpusNotesForPrompt';

const makeCandidate = (
  id: string,
  score: number,
  patch: Partial<CorpusNoteCandidate> = {},
): CorpusNoteCandidate => ({
  recordId: id,
  score,
  title: `Note ${id}`,
  summary: `Summary for ${id}`,
  ...patch,
});

describe('packCorpusNotesForPrompt', () => {
  it('keeps top notes by score up to max notes', () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      makeCandidate(String(index + 1), 12 - index),
    );

    const result = packCorpusNotesForPrompt(candidates);

    expect(result.notes).toHaveLength(INBOX_ASK_MAX_NOTES);
    expect(result.notes[0]?.recordId).toBe('1');
    expect(result.notes.at(-1)?.recordId).toBe(String(INBOX_ASK_MAX_NOTES));
    expect(result.droppedCount).toBe(12 - INBOX_ASK_MAX_NOTES);
  });

  it('adds transcript excerpt only for top hits without summary', () => {
    const result = packCorpusNotesForPrompt([
      makeCandidate('a', 1, { summary: null, transcript: 'alpha transcript body' }),
      makeCandidate('b', 0.9, { summary: null, transcript: 'beta transcript body' }),
      makeCandidate('c', 0.8, { summary: null, transcript: 'gamma transcript body' }),
    ]);

    expect(result.notes[0]?.transcriptExcerpt).toContain('alpha');
    expect(result.notes[1]?.transcriptExcerpt).toContain('beta');
    expect(result.notes[2]?.transcriptExcerpt).toBeUndefined();
  });

  it('stays under payload char budget by dropping lower-score notes', () => {
    const longSummary = 'x'.repeat(900);
    const candidates = Array.from({ length: INBOX_ASK_MAX_NOTES }, (_, index) =>
      makeCandidate(String(index + 1), INBOX_ASK_MAX_NOTES - index, {
        summary: longSummary,
      }),
    );

    const result = packCorpusNotesForPrompt(candidates, {
      maxPayloadChars: 2000,
    });

    expect(result.totalChars).toBeLessThanOrEqual(2000);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('centers query-aware transcript excerpts around matched terms', () => {
    const prefix = 'a'.repeat(200);
    const suffix = 'z'.repeat(200);
    const transcript = `${prefix} quarterly budget planning ${suffix}`;

    const excerpt = queryAwareTranscriptExcerpt(transcript, ['budget'], TRANSCRIPT_EXCERPT_MAX);

    expect(excerpt).toContain('budget');
    expect(excerpt?.length).toBeLessThanOrEqual(TRANSCRIPT_EXCERPT_MAX);
    expect(excerpt).not.toMatch(/^a{40}/);
  });

  it('includes transcript excerpt when query terms match transcript but not summary', () => {
    const result = packCorpusNotesForPrompt(
      [
        makeCandidate('a', 1, {
          summary: 'General meeting notes',
          transcript: 'We reviewed the quarterly budget allocation in detail.',
        }),
      ],
      { queryTerms: ['budget'] },
    );

    expect(result.notes[0]?.transcriptExcerpt).toContain('budget');
    expect(result.notes[0]?.summary).toBe('General meeting notes');
  });
});
