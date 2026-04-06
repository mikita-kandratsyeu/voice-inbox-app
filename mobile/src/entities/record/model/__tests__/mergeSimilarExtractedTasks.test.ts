import { mergeSimilarExtractedTasks } from '../mergeSimilarExtractedTasks';

const ai = (
  id: string,
  text: string,
  extra?: { priority?: 'high' | 'medium' | 'low'; deadline?: string },
) => ({
  id,
  text,
  isDone: false,
  source: 'ai' as const,
  ...extra,
});

describe('mergeSimilarExtractedTasks', () => {
  it('merges exact duplicates (normalized)', () => {
    const out = mergeSimilarExtractedTasks([ai('1', 'Buy milk'), ai('2', '  buy MILK  ')]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toMatch(/buy milk/i);
  });

  it('merges when one text contains the other', () => {
    const out = mergeSimilarExtractedTasks([
      ai('1', 'Call mom'),
      ai('2', 'Call mom about the appointment'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('Call mom about the appointment');
  });

  it('keeps unrelated tasks separate', () => {
    const out = mergeSimilarExtractedTasks([
      ai('1', 'Review quarterly budget spreadsheet'),
      ai('2', 'Schedule dentist cleaning appointment'),
    ]);
    expect(out).toHaveLength(2);
  });

  it('merges high token overlap for longer phrases', () => {
    const out = mergeSimilarExtractedTasks([
      ai('1', 'send project proposal draft to the client for review'),
      ai('2', 'send the project proposal draft to client review'),
    ]);
    expect(out).toHaveLength(1);
  });

  it('picks higher priority when merging', () => {
    const out = mergeSimilarExtractedTasks([
      ai('1', 'Book flight', { priority: 'low' }),
      ai('2', 'book flight', { priority: 'high' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].priority).toBe('high');
  });

  it('picks earlier deadline when merging', () => {
    const out = mergeSimilarExtractedTasks([
      ai('1', 'Pay rent', { deadline: '2026-06-01' }),
      ai('2', 'pay rent', { deadline: '2026-05-01' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].deadline).toBe('2026-05-01');
  });
});
