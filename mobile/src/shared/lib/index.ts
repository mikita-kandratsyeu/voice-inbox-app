export type { AiApiResult, AiMessageResult, AiProcessingResult, AiTask } from './ai-api';
export { pollAiMessage, postAiMessage } from './ai-api';
export type { StorageStats } from './async-storage';
export { clearCache, getStorageStats, storage } from './async-storage';
export type { AudioChunk } from './audio';
export { splitAudioIntoChunks } from './audio';
export { formatRelativeTime, formatShortDate } from './date';
export { formatDurationMmSs, formatTime, formatTimeWithMs } from './date';
export type { Database } from './db/client';
export { getDB, initDB } from './db/client';
export type { FolderInsert, FolderRow, RecordInsert, RecordRow } from './db/schema';
export { foldersTable, recordAskAiTable, recordsTable } from './db/schema';
export {
  checkEmbeddingAvailability,
  cosineSimilarity,
  generateEmbedding,
  generateEmbeddings,
  isEmbeddingAvailable,
  prepareEmbeddingModel,
} from './embeddings';
export { fetch, nitroFetch } from './fetch';
export {
  DEFAULT_FOLDER_BRAND_HEX,
  folderChipActiveForeground,
  isDarkSurfaceColor,
  parseRgbFromHex,
  relativeLuminanceFromHex,
  resolveDisplayFolderColor,
  resolveFolderColorForCurrentScheme,
  withAlphaHex,
} from './folderColor';
export { hapticError, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from './haptics';
export type { SupportedLocale } from './i18n';
export { applyAppLanguage, i18n, initI18n } from './i18n';
export { IOS_MIN_TOUCH_TARGET, iosHitSlopForVisualSize } from './iosTouchTarget';
export { NetworkStatusProvider, useNetworkStatus } from './NetworkStatusContext';
export { parseTaskDeadline } from './parseTaskDeadline';
export {
  getIosVersion,
  IS_ANDROID,
  IS_IOS,
  keyboardAvoidingBehavior,
  keyboardVerticalOffset,
  modalKeyboardBehavior,
  PLATFORM_OS,
} from './platform';
export {
  audioPathFromDbValue,
  audioPathToDbValue,
  ensureRecordingsDir,
  getRecordingsRelativePath,
  persistRecordingToDocuments,
  RECORDINGS_DIR,
  resolveAudioPath,
} from './recordings';
export { isArray, isNumber, isRecord, isString, isStringArrayItem } from './type-guards';
export { useAiModelName } from './useAiModelName';
export { useAiTabBannerDismiss } from './useAiTabBannerDismiss';
export { useIsSmallScreen } from './useIsSmallScreen';
export { useIsTablet } from './useIsTablet';
export { useScrollToTopOnTabPress } from './useScrollToTopOnTabPress';
export { useTabletContentMaxWidth } from './useTabletContentMaxWidth';
export {
  formatFileSize,
  getWhisperModelDownloadUrl,
  getWhisperModelPath,
  getWhisperModelsDir,
} from './whisper';
