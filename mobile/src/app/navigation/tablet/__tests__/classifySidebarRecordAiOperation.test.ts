import type { RecordListItem } from '@/entities/record';

import {
  classifySidebarRecordAiOperation,
  pickDominantSidebarAiOperationKind,
} from '../classifySidebarRecordAiOperation';

describe('classifySidebarRecordAiOperation', () => {
  it('prioritizes transcription over other statuses', () => {
    expect(
      classifySidebarRecordAiOperation({
        aiStatus: 'processing',
        meetingDialogueStatus: 'processing',
        summaryStatus: 'processing',
      } as RecordListItem),
    ).toBe('transcription');
  });

  it('maps meeting dialogue to speakers', () => {
    expect(
      classifySidebarRecordAiOperation({
        aiStatus: 'done',
        meetingDialogueStatus: 'processing',
      } as RecordListItem),
    ).toBe('speakers');
  });

  it('maps summary and tasks to summary', () => {
    expect(
      classifySidebarRecordAiOperation({
        summaryStatus: 'processing',
      } as RecordListItem),
    ).toBe('summary');
  });
});

describe('pickDominantSidebarAiOperationKind', () => {
  it('prefers the most frequent kind, then priority', () => {
    expect(
      pickDominantSidebarAiOperationKind(['summary', 'summary', 'speakers', 'transcription']),
    ).toBe('summary');
  });
});
