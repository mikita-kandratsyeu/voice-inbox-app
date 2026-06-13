import {
  estimateNoteDocumentCharacterCount,
  NOTE_DOCUMENT_EDITOR_COMFORTABLE_MAX_CHARS,
  shouldWarnNoteDocumentEditorSize,
} from '../noteDocumentEditorSizeLimits';

describe('noteDocumentEditorSizeLimits', () => {
  it('does not warn for comfortable documents', () => {
    expect(shouldWarnNoteDocumentEditorSize(NOTE_DOCUMENT_EDITOR_COMFORTABLE_MAX_CHARS)).toBe(
      false,
    );
  });

  it('warns for large documents', () => {
    expect(shouldWarnNoteDocumentEditorSize(NOTE_DOCUMENT_EDITOR_COMFORTABLE_MAX_CHARS + 1)).toBe(
      true,
    );
    expect(shouldWarnNoteDocumentEditorSize(23_197)).toBe(true);
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
