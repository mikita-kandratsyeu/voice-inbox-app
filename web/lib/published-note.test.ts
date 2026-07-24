import {
  computePublishedNoteHash,
  isPublishedNoteActive,
  normalizePublishedNoteExpiresIn,
  normalizePublishedNoteTemplate,
} from '@/lib/published-note';

describe('published-note helpers', () => {
  test('accepts supported templates', () => {
    expect(normalizePublishedNoteTemplate('noteBrief')).toBe('noteBrief');
    expect(normalizePublishedNoteTemplate('meetingSpeakerTurns')).toBe('meetingSpeakerTurns');
  });

  test('rejects unsupported templates', () => {
    expect(normalizePublishedNoteTemplate('invalid')).toBeNull();
    expect(normalizePublishedNoteTemplate('')).toBeNull();
  });

  test('parses expiry presets', () => {
    expect(normalizePublishedNoteExpiresIn('never')).toBeNull();
    expect(normalizePublishedNoteExpiresIn('1d')).toBeInstanceOf(Date);
    expect(normalizePublishedNoteExpiresIn('7d')).toBeInstanceOf(Date);
    expect(normalizePublishedNoteExpiresIn('30d')).toBeInstanceOf(Date);
    expect(normalizePublishedNoteExpiresIn('bad')).toBe('invalid');
  });

  test('marks active state correctly', () => {
    expect(isPublishedNoteActive({ revokedAt: new Date(), expiresAt: null })).toBe(false);
    expect(isPublishedNoteActive({ expiresAt: new Date(Date.now() - 1000), revokedAt: null })).toBe(
      false,
    );
    expect(isPublishedNoteActive({ expiresAt: new Date(Date.now() + 1000), revokedAt: null })).toBe(
      true,
    );
  });

  test('hash is deterministic', () => {
    expect(computePublishedNoteHash('abc')).toBe(computePublishedNoteHash('abc'));
    expect(computePublishedNoteHash('abc')).not.toBe(computePublishedNoteHash('abcd'));
  });
});
