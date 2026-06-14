import type { VoiceRecord } from '@/entities/record';

import { parseNoteDocumentAsync, shouldUseAsyncParsing } from '../parseNoteDocumentAsync';

describe('parseNoteDocumentAsync', () => {
  const createMockRecord = (overrides?: Partial<VoiceRecord>): VoiceRecord =>
    ({
      id: 'test-id',
      title: 'Test Note',
      transcript: 'Test transcript',
      duration: '0',
      createdAt: new Date().toISOString(),
      status: 'idle',
      tags: [],
      tasks: [],
      ...overrides,
    }) as VoiceRecord;

  const mockRecord = createMockRecord();

  it('determines when to use async parsing based on length', () => {
    expect(shouldUseAsyncParsing(5_000)).toBe(false);
    expect(shouldUseAsyncParsing(9_999)).toBe(false);
    expect(shouldUseAsyncParsing(10_000)).toBe(true);
    expect(shouldUseAsyncParsing(50_000)).toBe(true);
  });

  it('parses small documents synchronously', async () => {
    const markdown = '# Test Note\n\nSmall document content.';
    const result = await parseNoteDocumentAsync(markdown, mockRecord);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.title).toBe('Test Note');
    }
  });

  it('parses large documents asynchronously', async () => {
    // Create a document larger than 10k characters
    const largeContent = 'Content. '.repeat(1500); // ~13.5k chars
    const markdown = `# Large Note\n\n${largeContent}`;

    const result = await parseNoteDocumentAsync(markdown, mockRecord);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.title).toBe('Large Note');
    }
  });

  it('handles parse errors for invalid markdown', async () => {
    const invalidMarkdown = 'No title here, just content';
    const result = await parseNoteDocumentAsync(invalidMarkdown, mockRecord);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('title_missing');
    }
  });

  it('returns consistent results for sync and async paths', async () => {
    const markdown = '# Test\n\nContent';

    // Small document (sync path)
    const syncResult = await parseNoteDocumentAsync(markdown, mockRecord);

    // Large document (async path) - pad to exceed threshold
    const largePadding = 'x'.repeat(10_000);
    const largeMarkdown = `# Test\n\n${largePadding}\n\nContent`;
    const asyncResult = await parseNoteDocumentAsync(largeMarkdown, mockRecord);

    expect(syncResult.ok).toBe(asyncResult.ok);
    if (syncResult.ok && asyncResult.ok) {
      expect(syncResult.patch.title).toBe(asyncResult.patch.title);
    }
  });
});
