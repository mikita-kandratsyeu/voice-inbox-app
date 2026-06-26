import type { TranscriptSegment } from '@/entities/record';

import {
  buildMeetingDialogueMarkdownFromNativeSegments,
  buildNativeMeetingUtterances,
} from '../nativeMeetingDialogue';

describe('nativeMeetingDialogue', () => {
  const segments: TranscriptSegment[] = [
    {
      id: '0',
      startTime: '00:00',
      text: 'Привет',
      speakerId: 'speaker_0',
    },
    {
      id: '1',
      startTime: '00:05',
      text: 'как дела',
      speakerId: 'speaker_0',
    },
    {
      id: '2',
      startTime: '00:10',
      text: 'Нормально',
      speakerId: 'speaker_1',
    },
  ];

  it('groups consecutive turns by speaker', () => {
    expect(buildNativeMeetingUtterances(segments)).toEqual([
      expect.objectContaining({
        speakerLabel: 'Speaker 1',
        body: 'Привет как дела',
      }),
      expect.objectContaining({
        speakerLabel: 'Speaker 2',
        body: 'Нормально',
      }),
    ]);
  });

  it('builds markdown compatible with meeting dialogue parser', () => {
    expect(buildMeetingDialogueMarkdownFromNativeSegments(segments)).toBe(
      'Speaker 1: Привет как дела\n\nSpeaker 2: Нормально',
    );
  });
});
