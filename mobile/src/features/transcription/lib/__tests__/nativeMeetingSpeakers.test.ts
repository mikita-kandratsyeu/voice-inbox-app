import type { TranscriptSegment } from '@/entities/record';

import { shouldUseIosWhisperKitEngine } from '../../config/transcriptionEngine';
import {
  recordHasNativeSpeakerDiarization,
  shouldRunTranscriptionDiarization,
  shouldShowMeetingDialogueAiDisclaimer,
  shouldUseNativeMeetingSpeakers,
} from '../nativeMeetingSpeakers';

jest.mock('../../config/transcriptionEngine', () => ({
  shouldUseIosWhisperKitEngine: jest.fn(),
}));

const mockShouldUseIosWhisperKitEngine = jest.mocked(shouldUseIosWhisperKitEngine);

describe('nativeMeetingSpeakers', () => {
  beforeEach(() => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(true);
  });

  it('detects native speaker segments', () => {
    const segments: TranscriptSegment[] = [
      { id: '0', startTime: '00:00', text: 'hello', speakerId: 'speaker_0' },
    ];
    expect(recordHasNativeSpeakerDiarization({ transcriptSegments: segments })).toBe(true);
    expect(shouldShowMeetingDialogueAiDisclaimer({ transcriptSegments: segments })).toBe(false);
  });

  it('shows AI disclaimer when speaker turns are not voice-diarized', () => {
    expect(shouldShowMeetingDialogueAiDisclaimer({ transcriptSegments: [] })).toBe(true);
    expect(
      shouldShowMeetingDialogueAiDisclaimer({
        transcriptSegments: [{ id: '0', startTime: '00:00', text: 'hello' }],
      }),
    ).toBe(true);
  });

  it('uses native meeting speakers for WhisperKit meetings with stored dialogue', () => {
    expect(
      shouldUseNativeMeetingSpeakers({
        classification: 'meeting',
        meetingDialogue: 'Speaker 1: hello',
        transcriptSegments: [],
      }),
    ).toBe(true);
  });

  it('does not use native meeting speakers when WhisperKit is off', () => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(false);
    expect(shouldRunTranscriptionDiarization({ classification: 'meeting' }, true)).toBe(false);
  });
});
