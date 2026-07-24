import { resolvePickerImportFileName, sanitizePickerImportFileName } from '../documentPickerNames';

describe('sanitizePickerImportFileName', () => {
  it('replaces path separators', () => {
    expect(sanitizePickerImportFileName('a/b\\c.srt')).toBe('a_b_c.srt');
  });

  it('removes square brackets from cache file names', () => {
    expect(sanitizePickerImportFileName('[Russian] test.srt')).toBe('Russian test.srt');
  });

  it('falls back when empty', () => {
    expect(sanitizePickerImportFileName('   ')).toBe('imported-file');
  });

  it('truncates very long names but keeps extension', () => {
    const longStem = 'x'.repeat(300);
    const result = sanitizePickerImportFileName(`${longStem}.srt`);
    expect(result.endsWith('.srt')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(200);
  });
});

describe('resolvePickerImportFileName', () => {
  it('prefers picker name', () => {
    expect(
      resolvePickerImportFileName({
        name: '[Russian] test.srt',
        uri: 'file:///tmp/other.vtt',
      }),
    ).toBe('Russian test.srt');
  });

  it('falls back to uri basename', () => {
    expect(
      resolvePickerImportFileName({
        name: null,
        uri: 'file:///private/var/mobile/imports/%5BDemo%5D.srt',
      }),
    ).toBe('Demo.srt');
  });
});
