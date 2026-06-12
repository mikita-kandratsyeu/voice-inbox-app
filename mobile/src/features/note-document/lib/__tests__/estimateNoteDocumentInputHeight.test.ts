import { estimateNoteDocumentInputHeight } from '../estimateNoteDocumentInputHeight';

describe('estimateNoteDocumentInputHeight', () => {
  it('returns minHeight for empty text', () => {
    expect(estimateNoteDocumentInputHeight('', 280, false)).toBe(280);
  });

  it('grows with line count', () => {
    const short = estimateNoteDocumentInputHeight('Hello', 44, false);
    const long = estimateNoteDocumentInputHeight('Line one\nLine two\nLine three', 44, false);

    expect(long).toBeGreaterThan(short);
  });

  it('accounts for wrapped long lines on phone', () => {
    const wrapped = estimateNoteDocumentInputHeight('a'.repeat(120), 44, false);
    const single = estimateNoteDocumentInputHeight('a'.repeat(20), 44, false);

    expect(wrapped).toBeGreaterThan(single);
  });
});
