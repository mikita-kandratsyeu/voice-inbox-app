export const NOTE_DOCUMENT_SAVING_TIP_KEYS = [
  'recordingDetail.document.savingTips.sync',
  'recordingDetail.document.savingTips.tasks',
  'recordingDetail.document.savingTips.sections',
  'recordingDetail.document.savingTips.source',
] as const;

export const NOTE_DOCUMENT_SAVING_TIP_INTERVAL_MS = 3000;

export function pickRandomNoteDocumentSavingTipIndex(): number {
  if (NOTE_DOCUMENT_SAVING_TIP_KEYS.length <= 1) return 0;
  return Math.floor(Math.random() * NOTE_DOCUMENT_SAVING_TIP_KEYS.length);
}
