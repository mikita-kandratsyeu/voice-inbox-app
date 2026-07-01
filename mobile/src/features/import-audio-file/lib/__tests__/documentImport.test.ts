import {
  isDocumentImportFileName,
  isPdfImportFileName,
  isPlainTextImportFileName,
  MAX_DOCUMENT_IMPORT_CHARS,
  normalizeDocumentText,
  parseDocumentImport,
} from '../documentImport';

describe('documentImport', () => {
  it('detects document file names', () => {
    expect(isDocumentImportFileName('notes.md')).toBe(true);
    expect(isDocumentImportFileName('report.markdown')).toBe(true);
    expect(isDocumentImportFileName('brief.pdf')).toBe(true);
    expect(isPlainTextImportFileName('memo.txt')).toBe(true);
    expect(isPdfImportFileName('scan.pdf')).toBe(true);
    expect(isDocumentImportFileName('voice.m4a')).toBe(false);
  });

  it('normalizes and parses markdown/plain text', () => {
    const parsed = parseDocumentImport('\uFEFF# Title\r\n\r\nBody line');
    expect(parsed).toEqual({
      transcript: '# Title\n\nBody line',
      charCount: 18,
    });
  });

  it('rejects empty and oversized documents', () => {
    expect(parseDocumentImport('   ')).toBeNull();
    expect(parseDocumentImport('x'.repeat(MAX_DOCUMENT_IMPORT_CHARS + 1))).toBeNull();
    expect(normalizeDocumentText('  hello  ')).toBe('hello');
  });
});
