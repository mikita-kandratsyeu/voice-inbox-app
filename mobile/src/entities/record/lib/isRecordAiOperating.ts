import type { RecordingStatus, VoiceRecord } from '../model/types';

type RecordAiOperatingFields = Pick<
  VoiceRecord,
  | 'aiStatus'
  | 'summaryStatus'
  | 'tasksStatus'
  | 'translationStatus'
  | 'askAiStatus'
  | 'meetingDialogueStatus'
>;

const isAiOperatingStatus = (status?: RecordingStatus): boolean =>
  status === 'loading_model' || status === 'processing' || status === 'cancelling';

export function isTranscriptionOperating(aiStatus?: RecordingStatus): boolean {
  return isAiOperatingStatus(aiStatus);
}

export function isRecordAiOperating(record: RecordAiOperatingFields): boolean {
  return (
    isAiOperatingStatus(record.aiStatus) ||
    isAiOperatingStatus(record.summaryStatus) ||
    isAiOperatingStatus(record.tasksStatus) ||
    isAiOperatingStatus(record.translationStatus) ||
    isAiOperatingStatus(record.askAiStatus) ||
    record.meetingDialogueStatus === 'processing'
  );
}
