export type { RecordingMarkKindUiConfig } from './lib/recordingMarkKindUi';
export {
  getRecordingMarkKindAccentColors,
  getRecordingMarkKindUi,
  RECORDING_MARK_KIND_UI,
  RECORDING_MARK_PICKER_KINDS,
} from './lib/recordingMarkKindUi';
export { shouldUseTranscriptSegmentView } from './lib/transcriptDisplay';
export {
  estimatePlainTextInputHeight,
  stripDocumentTranscriptMarkup,
} from './lib/transcriptText';
export {
  DEFAULT_RECORDING_MARK_KIND,
  normalizeRecordingMarkKind,
  RECORDING_MARK_LABEL_MAX,
  sanitizeRecordingMark,
} from './model/normalizeRecordingMark';
export type { TrashedRecordListItem } from './model/repository';
export { recordRepository } from './model/repository';
export { useRecordStore } from './model/store';
export type {
  MeetingDialogueLoadStatus,
  MeetingSummaryTemplate,
  RecordClassification,
  RecordHeavyFields,
  RecordingMark,
  RecordingMarkKind,
  RecordingStatus,
  RecordListItem,
  RecordStatus,
  TaskItem,
  TaskSource,
  TranscriptSegment,
  VoiceRecord,
  WordToken,
} from './model/types';
export { isRecordingMarkKind, RECORDING_MARK_KINDS } from './model/types';
export { AiStatusPill, RecordCard, RecordCardExpanded, RecordingMarkKindCard } from './ui';
