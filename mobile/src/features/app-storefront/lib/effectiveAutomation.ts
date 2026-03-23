export function shouldApplyAutoTranscribeOnSave(
  persistedToggle: boolean,
  isProActive: boolean,
): boolean {
  return persistedToggle && isProActive;
}

export function shouldApplyAutoAiAfterTranscription(
  persistedToggle: boolean,
  isProActive: boolean,
): boolean {
  return shouldApplyAutoTranscribeOnSave(persistedToggle, isProActive);
}
