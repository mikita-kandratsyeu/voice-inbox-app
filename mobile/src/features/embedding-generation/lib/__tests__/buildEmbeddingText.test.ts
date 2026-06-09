import type { VoiceRecord } from '@/entities/record';

import { buildEmbeddingText } from '../buildEmbeddingText';

function record(overrides: Partial<VoiceRecord> = {}): VoiceRecord {
  return {
    id: 'rec-1',
    title: 'Title',
    transcript: '',
    duration: '1:00',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildEmbeddingText', () => {
  it('combines title, summary, key phrases, and tasks', () => {
    const longSummary = `${'Discussed launch timeline. '.repeat(5)}`.slice(0, 80);
    const text = buildEmbeddingText(
      record({
        title: 'Weekly sync',
        summary: longSummary,
        keyPhrases: ['launch', 'timeline'],
        tasks: [
          { id: 't1', text: 'Ship build', isDone: false },
          { id: 't2', text: 'Update docs', isDone: false },
        ],
        transcript: 'Long transcript that should be skipped when summary is long enough.',
      }),
    );

    expect(text).toContain('Weekly sync');
    expect(text).toContain(longSummary.slice(0, 20));
    expect(text).toContain('launch, timeline');
    expect(text).toContain('Ship build. Update docs');
    expect(text).not.toContain('Long transcript');
  });

  it('includes transcript when summary is missing or short', () => {
    const withShortSummary = buildEmbeddingText(
      record({
        title: '',
        summary: 'Brief',
        transcript: 'Full meeting transcript content.',
      }),
    );
    expect(withShortSummary).toContain('Full meeting transcript');

    const withoutSummary = buildEmbeddingText(
      record({
        title: '',
        transcript: 'Only transcript available.',
      }),
    );
    expect(withoutSummary).toBe('Only transcript available.');
  });

  it('truncates long fields and caps total length', () => {
    const text = buildEmbeddingText(
      record({
        title: 'T'.repeat(200),
        summary: 'S'.repeat(800),
        tasks: [{ id: 't1', text: 'U'.repeat(2000), isDone: false }],
      }),
    );

    expect(text).toHaveLength(1800);
    expect(text.startsWith('T'.repeat(120))).toBe(true);
    expect(text.includes('S'.repeat(600))).toBe(true);
  });

  it('limits key phrases and task count', () => {
    const phrases = Array.from({ length: 20 }, (_, i) => `phrase-${i}`);
    const tasks = Array.from({ length: 12 }, (_, i) => ({
      id: `t${i}`,
      text: `task-${i}`,
      isDone: false,
    }));

    const text = buildEmbeddingText(record({ keyPhrases: phrases, tasks }));

    expect(text.match(/phrase-/g)?.length).toBe(12);
    expect(text).toContain('task-0');
    expect(text).toContain('task-7');
    expect(text).not.toContain('task-8');
  });
});
