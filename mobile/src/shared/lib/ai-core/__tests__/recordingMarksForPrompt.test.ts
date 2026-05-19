import {
  buildRecordingMarksPromptBlock,
  formatRecordingMarkOffset,
  sanitizeRecordingMarksForPrompt,
} from '../recordingMarksForPrompt';

describe('recordingMarksForPrompt', () => {
  it('formatRecordingMarkOffset formats mm:ss', () => {
    expect(formatRecordingMarkOffset(0)).toBe('00:00');
    expect(formatRecordingMarkOffset(125_000)).toBe('02:05');
  });

  it('sanitizeRecordingMarksForPrompt sorts and caps labels', () => {
    const out = sanitizeRecordingMarksForPrompt([
      { id: '2', offsetMs: 60_000, label: '  later  ' },
      { id: '1', offsetMs: 5_000, label: '' },
      { id: 'x', offsetMs: -1, label: 'bad' },
    ]);
    expect(out).toEqual([
      { offsetMs: 5000, label: '' },
      { offsetMs: 60000, label: 'later' },
    ]);
  });

  it('buildRecordingMarksPromptBlock includes pins section', () => {
    const block = buildRecordingMarksPromptBlock([{ offsetMs: 74_000, label: 'budget' }]);
    expect(block).toContain('RECORDING PINS');
    expect(block).toContain('[01:14]');
    expect(block).toContain('budget');
  });
});
