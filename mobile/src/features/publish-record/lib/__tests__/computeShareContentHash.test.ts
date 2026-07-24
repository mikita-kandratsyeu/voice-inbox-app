import { computeShareContentHash } from '@/features/publish-record/lib/computeShareContentHash';

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  default: {
    createHash: () => {
      const chunks: string[] = [];
      return {
        update: (value: string) => {
          chunks.push(value);
          return undefined;
        },
        digest: () => {
          const input = chunks.join('');
          if (input === 'note body') return 'a1b2c3';
          if (input === 'note body!') return 'd4e5f6';
          return '000000';
        },
      };
    },
  },
}));

describe('computeShareContentHash', () => {
  test('returns stable hash for same content', () => {
    expect(computeShareContentHash('note body')).toBe(computeShareContentHash('note body'));
  });

  test('returns different hash for changed content', () => {
    expect(computeShareContentHash('note body')).not.toBe(computeShareContentHash('note body!'));
  });
});
