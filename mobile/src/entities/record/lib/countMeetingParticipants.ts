import { buildSpeakerRoster } from '@/screens/recording-detail/lib/buildSpeakerRoster';
import { parseMeetingDialogue } from '@/screens/recording-detail/lib/parseMeetingDialogue';

export function countMeetingParticipants(
  meetingDialogue: string | undefined,
  meetingSpeakerLabels?: Record<string, string>,
): number {
  const raw = meetingDialogue?.trim();
  if (!raw) {
    return 0;
  }

  return buildSpeakerRoster(parseMeetingDialogue(raw), meetingSpeakerLabels).length;
}
