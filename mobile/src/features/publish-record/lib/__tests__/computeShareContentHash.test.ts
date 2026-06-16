import { computeShareContentHash } from '@/features/publish-record/lib/computeShareContentHash';

describe('computeShareContentHash', () => {
  test('returns stable hash for same content', () => {
    expect(computeShareContentHash('note body')).toBe(computeShareContentHash('note body'));
  });

  test('returns different hash for changed content', () => {
    expect(computeShareContentHash('note body')).not.toBe(computeShareContentHash('note body!'));
  });
});
