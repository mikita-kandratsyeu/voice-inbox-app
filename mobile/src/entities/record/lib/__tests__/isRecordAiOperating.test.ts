import { isRecordAiOperating } from '../isRecordAiOperating';

describe('isRecordAiOperating', () => {
  it('returns true for transcription, generation, translation, and ask-ai processing', () => {
    expect(isRecordAiOperating({ aiStatus: 'processing' })).toBe(true);
    expect(isRecordAiOperating({ aiStatus: 'loading_model' })).toBe(true);
    expect(isRecordAiOperating({ aiStatus: 'cancelling' })).toBe(true);
    expect(isRecordAiOperating({ summaryStatus: 'processing' })).toBe(true);
    expect(isRecordAiOperating({ tasksStatus: 'processing' })).toBe(true);
    expect(isRecordAiOperating({ translationStatus: 'processing' })).toBe(true);
    expect(isRecordAiOperating({ askAiStatus: 'processing' })).toBe(true);
    expect(isRecordAiOperating({ meetingDialogueStatus: 'processing' })).toBe(true);
  });

  it('returns false when no ai operation is active', () => {
    expect(
      isRecordAiOperating({
        aiStatus: 'done',
        summaryStatus: 'done',
        tasksStatus: 'idle',
        translationStatus: 'idle',
        askAiStatus: undefined,
      }),
    ).toBe(false);
    expect(isRecordAiOperating({ aiStatus: 'paused' })).toBe(false);
    expect(isRecordAiOperating({ aiStatus: 'resumable' })).toBe(false);
  });
});
