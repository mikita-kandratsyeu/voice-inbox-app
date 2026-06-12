import { estimatePlainTextInputHeight, stripDocumentTranscriptMarkup } from '../transcriptText';

describe('stripDocumentTranscriptMarkup', () => {
  it('removes block and inline bold timestamp markers', () => {
    const input =
      '**[00:00]** **[00:00]** **[00:00]** Первый абзац.\n\n**[00:42]** Второй абзац.';

    expect(stripDocumentTranscriptMarkup(input)).toBe('Первый абзац.\n\nВторой абзац.');
  });
});

describe('estimatePlainTextInputHeight', () => {
  it('returns a taller height for multi-line text', () => {
    const short = estimatePlainTextInputHeight('Hi', 44);
    const long = estimatePlainTextInputHeight('Line one\nLine two\nLine three', 44);

    expect(long).toBeGreaterThan(short);
  });
});
