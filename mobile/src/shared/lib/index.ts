export type { AiApiResult, AiMessageResult, AiProcessingResult, AiTask } from './ai-api';
export { pollAiMessage, postAiMessage } from './ai-api';
export type { StorageStats } from './async-storage';
export { clearCache, getStorageStats, storage } from './async-storage';
export type { AudioChunk } from './audio';
export { splitAudioIntoChunks } from './audio';
export { formatRelativeTime, formatShortDate } from './date';
export { formatTime, formatTimeWithMs } from './date';
export type { Database } from './db/client';
export { getDB, initDB } from './db/client';
export type { RecordInsert, RecordRow } from './db/schema';
export { recordsTable } from './db/schema';
export {
  checkEmbeddingAvailability,
  cosineSimilarity,
  generateEmbedding,
  generateEmbeddings,
  isEmbeddingAvailable,
  prepareEmbeddingModel,
} from './embeddings';
export { fetch } from './fetch';
export { hapticError, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from './haptics';
export type { SupportedLocale } from './i18n';
export { applyAppLanguage, i18n, initI18n } from './i18n';
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
export { ensureRecordingsDir, persistRecordingToDocuments, RECORDINGS_DIR } from './recordings';
export { isArray, isNumber, isRecord, isString, isStringArrayItem } from './type-guards';
export { useAiModelName } from './useAiModelName';
export { useAiTabBannerDismiss } from './useAiTabBannerDismiss';
export { useIsTablet } from './useIsTablet';
export {
  formatFileSize,
  getWhisperModelPath,
  getWhisperModelsDir,
  WHISPER_MODEL_DOWNLOAD_URLS,
} from './whisper';
