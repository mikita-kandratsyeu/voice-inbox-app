import {
  estimateNoteDocumentCharacterCount,
  getNoteDocumentEditorCharacterLimit,
  shouldWarnNoteDocumentEditorSize,
} from '../noteDocumentEditorSizeLimits';

// Mock deviceMemoryTier to avoid native module dependencies
jest.mock('@/shared/lib/deviceMemoryTier', () => ({
  resolveDeviceMemoryTier: jest.fn(() => 'medium'),
}));

describe('noteDocumentEditorSizeLimits', () => {
  it('returns device-specific character limit', () => {
    const limit = getNoteDocumentEditorCharacterLimit();
    // Medium tier device should return 8000
    expect(limit).toBe(8_000);
  });

  it('does not warn for documents within device limit', () => {
    const limit = getNoteDocumentEditorCharacterLimit();
    expect(shouldWarnNoteDocumentEditorSize(limit)).toBe(false);
    expect(shouldWarnNoteDocumentEditorSize(limit - 100)).toBe(false);
  });

  it('warns for documents exceeding device limit', () => {
    const limit = getNoteDocumentEditorCharacterLimit();
    expect(shouldWarnNoteDocumentEditorSize(limit + 1)).toBe(true);
    expect(shouldWarnNoteDocumentEditorSize(limit + 10_000)).toBe(true);
  });

  it('estimates document size from record fields', () => {
    const estimate = estimateNoteDocumentCharacterCount({
      title: 'Title',
      summary: 'Summary',
      transcript: 'Hello',
      translatedTranscript: undefined,
      meetingDialogue: undefined,
      tags: ['a', 'b'],
      keyPhrases: ['k'],
      nextSteps: ['step'],
      tasks: [{ id: '1', text: 'Task', isDone: false }],
    });

    expect(estimate).toBeGreaterThan('TitleSummaryHello'.length);
  });
});
