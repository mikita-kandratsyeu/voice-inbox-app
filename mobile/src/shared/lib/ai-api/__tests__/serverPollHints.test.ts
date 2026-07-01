import { describe, expect, it } from '@jest/globals';

import { parseServerPollHints } from '../serverPollHints';

describe('parseServerPollHints', () => {
  it('returns undefined for non-objects', () => {
    expect(parseServerPollHints(null)).toBeUndefined();
    expect(parseServerPollHints('x')).toBeUndefined();
  });

  it('parses polling hint fields with guards', () => {
    expect(
      parseServerPollHints({
        retryAfterMs: 1500,
        estimatedCompletionMs: 30_000,
        progress: 42,
        pollExpiresAt: ' 2026-07-01T12:05:00.000Z ',
      }),
    ).toEqual({
      retryAfterMs: 1500,
      estimatedCompletionMs: 30_000,
      progress: 42,
      pollExpiresAt: '2026-07-01T12:05:00.000Z',
    });
  });

  it('ignores invalid hint values', () => {
    expect(
      parseServerPollHints({
        retryAfterMs: 0,
        estimatedCompletionMs: -1,
        progress: 120,
        pollExpiresAt: '   ',
      }),
    ).toBeUndefined();
  });
});
