import type { VoiceRecord } from '@/entities/record';
import type { ShareBriefTemplate } from '@/features/share-record/lib/buildShareText';

export function resolveNoteDocumentTemplate(record: VoiceRecord): ShareBriefTemplate {
  const isMeeting = record.classification === 'meeting' || Boolean(record.meetingDialogue?.trim());
  return isMeeting ? 'meetingBrief' : 'noteBrief';
}
