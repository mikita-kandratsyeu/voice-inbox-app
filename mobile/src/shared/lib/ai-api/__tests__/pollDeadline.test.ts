import { describe, expect, it } from '@jest/globals';

import {
  extendPollDeadlineMs,
  parsePollExpiresAtMs,
  remainingPollMs,
  resolvePollDeadlineMs,
} from '../pollDeadline';

describe('pollDeadline', () => {
  const now = Date.parse('2026-07-01T12:00:00.000Z');

  it('parses pollExpiresAt ISO timestamps', () => {
    expect(parsePollExpiresAtMs('2026-07-01T12:05:00.000Z')).toBe(
      Date.parse('2026-07-01T12:05:00.000Z'),
    );
    expect(parsePollExpiresAtMs('')).toBeNull();
    expect(parsePollExpiresAtMs(undefined)).toBeNull();
  });

  it('prefers server pollExpiresAt over fallback timeout', () => {
    expect(
      resolvePollDeadlineMs({
        pollExpiresAt: '2026-07-01T12:10:00.000Z',
        fallbackTimeoutMs: 300_000,
        nowMs: now,
      }),
    ).toBe(Date.parse('2026-07-01T12:10:00.000Z'));
  });

  it('falls back to relative timeout when pollExpiresAt is missing', () => {
    expect(
      resolvePollDeadlineMs({
        fallbackTimeoutMs: 120_000,
        nowMs: now,
      }),
    ).toBe(now + 120_000);
  });

  it('extends deadline only when server sends a later value', () => {
    const current = now + 300_000;
    expect(extendPollDeadlineMs(current, '2026-07-01T12:10:00.000Z')).toBe(
      Date.parse('2026-07-01T12:10:00.000Z'),
    );
    expect(extendPollDeadlineMs(current, '2026-07-01T12:04:00.000Z')).toBe(current);
  });

  it('computes remaining poll budget', () => {
    expect(remainingPollMs(now + 45_000, now)).toBe(45_000);
    expect(remainingPollMs(now - 1, now)).toBe(0);
  });
});
