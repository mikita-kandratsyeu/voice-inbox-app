export const NOTE_DOCUMENT_LOADING_TIP_KEYS = [
  'recordingDetail.document.loadingTips.readingMode',
  'recordingDetail.document.loadingTips.editMode',
  'recordingDetail.document.loadingTips.sections',
  'recordingDetail.document.loadingTips.save',
] as const;

export const NOTE_DOCUMENT_LOADING_TIP_INTERVAL_MS = 3000;

export function pickRandomNoteDocumentLoadingTipIndex(): number {
  if (NOTE_DOCUMENT_LOADING_TIP_KEYS.length <= 1) return 0;
  return Math.floor(Math.random() * NOTE_DOCUMENT_LOADING_TIP_KEYS.length);
}
