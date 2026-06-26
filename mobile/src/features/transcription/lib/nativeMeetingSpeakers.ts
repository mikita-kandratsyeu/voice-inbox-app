import type { TranscriptSegment, VoiceRecord } from '@/entities/record';

import { shouldUseIosWhisperKitEngine } from '../config/transcriptionEngine';

export type TranscriptionDiarizationContext = {
  isRetranscribe: boolean;
  autoRefreshSpeakers: boolean;
};

export const hasNativeSpeakerSegments = (
  segments: TranscriptSegment[] | undefined,
): boolean => segments?.some((segment) => Boolean(segment.speakerId?.trim())) ?? false;

/** Pro meeting notes with improved iOS transcription get on-device voice diarization. */
export function shouldRunTranscriptionDiarization(
  record: Pick<VoiceRecord, 'classification'>,
  isProActive: boolean,
  context?: TranscriptionDiarizationContext,
): boolean {
  if (!isProActive || !shouldUseIosWhisperKitEngine()) {
    return false;
  }
  if (record.classification !== 'meeting') {
    return false;
  }
  if (context?.isRetranscribe && context.autoRefreshSpeakers === false) {
    return false;
  }
  return true;
}

export function recordHasNativeSpeakerDiarization(
  record: Pick<VoiceRecord, 'transcriptSegments'>,
): boolean {
  return hasNativeSpeakerSegments(record.transcriptSegments);
}

export function shouldUseNativeMeetingSpeakers(
  record: Pick<VoiceRecord, 'classification' | 'transcriptSegments' | 'meetingDialogue'>,
): boolean {
  if (!shouldUseIosWhisperKitEngine() || record.classification !== 'meeting') {
    return false;
  }
  return (
    recordHasNativeSpeakerDiarization(record) || Boolean(record.meetingDialogue?.trim())
  );
}
