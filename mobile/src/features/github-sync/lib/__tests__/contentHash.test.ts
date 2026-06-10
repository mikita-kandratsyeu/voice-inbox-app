import { hashFileMap, sha256Hex } from '../contentHash';

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  default: {
    createHash: () => ({
      update: jest.fn().mockReturnThis(),
      digest: () => 'deadbeef',
    }),
  },
}));

describe('contentHash', () => {
  it('hashes string content', () => {
    expect(sha256Hex('hello')).toBe('deadbeef');
  });

  it('hashes every file in a map', () => {
    const files = new Map<string, string>([
      ['voice-inbox-ai/notes/a.md', '# A'],
      ['voice-inbox-ai/manifest.json', '{}'],
    ]);

    expect(hashFileMap(files)).toEqual({
      'voice-inbox-ai/notes/a.md': 'deadbeef',
      'voice-inbox-ai/manifest.json': 'deadbeef',
    });
  });
});
