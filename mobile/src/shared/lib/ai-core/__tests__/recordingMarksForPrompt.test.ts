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

  it('sanitizeRecordingMarksForPrompt sorts and normalizes kind', () => {
    const out = sanitizeRecordingMarksForPrompt([
      { id: '2', offsetMs: 60_000, label: '  later  ', kind: 'task' },
      { id: '1', offsetMs: 5_000, label: '', kind: 'important' },
      { id: 'x', offsetMs: -1, label: 'bad', kind: 'quote' },
    ]);
    expect(out).toEqual([
      { offsetMs: 5000, label: '', kind: 'important' },
      { offsetMs: 60000, label: 'later', kind: 'task' },
    ]);
  });

  it('buildRecordingMarksPromptBlock includes kind tags', () => {
    const block = buildRecordingMarksPromptBlock([
      { offsetMs: 74_000, label: 'budget', kind: 'important' },
    ]);
    expect(block).toContain('RECORDING PINS');
    expect(block).toContain('[important]');
    expect(block).toContain('[01:14]');
    expect(block).toContain('budget');
    expect(block).toContain('[quote]');
  });
});
