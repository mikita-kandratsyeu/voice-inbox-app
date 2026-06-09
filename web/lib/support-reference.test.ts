import {
  formatSupportReference,
  parseSupportReferenceQuery,
  SUPPORT_REFERENCE_PREFIX,
} from './support-reference';

describe('support-reference', () => {
  it('formatSupportReference uses numeric reference when available', () => {
    expect(formatSupportReference(42)).toBe(`${SUPPORT_REFERENCE_PREFIX}-42`);
  });

  it('formatSupportReference falls back to row id prefix', () => {
    expect(formatSupportReference(null, 'abcdef123456')).toBe(
      `${SUPPORT_REFERENCE_PREFIX}-abcdef12`,
    );
  });

  it('parseSupportReferenceQuery parses VI-123 references', () => {
    expect(parseSupportReferenceQuery('VI-123')).toBe(123);
    expect(parseSupportReferenceQuery('vi-7')).toBe(7);
    expect(parseSupportReferenceQuery('VI-abc')).toBeNull();
    expect(parseSupportReferenceQuery('ticket-1')).toBeNull();
  });
});
