export { MIN_TRANSCRIBE_MS } from './config/constants';
export {
  detectDevicePerformanceTier,
  type DevicePerformanceProfile,
  type DevicePerformanceTier,
  getAdaptiveCheckpointInterval,
  getDevicePerformanceProfile,
} from './lib/devicePerformanceProfile';
export { getWhisperContext, releaseWhisperContext } from './lib/initWhisper';
export { notifyAutoTranscriptionTooShort } from './lib/notifyAutoTranscriptionTooShort';
export {
  type AutoTranscriptionScheduleResult,
  tryScheduleAutoTranscription,
} from './lib/scheduleAutoTranscription';
export { transcribeAudio } from './lib/transcribeAudio';
export { isTooShortForTranscription } from './lib/transcriptionDuration';
export {
  createTranscriptionPausedNotificationPressHandler,
  handleTranscriptionPausedNotificationData,
  handleTranscriptionPausedNotificationPress,
} from './lib/transcriptionPausedNotification';
export {
  isTranscriptionBlockedForRecord,
  useTranscriptionBlockedForRecord,
} from './model/transcriptionConcurrency';
export { abortTranscriptionForAppBackground } from './model/transcriptionRuntimeRegistry';
export { type StartTranscriptionOptions, useTranscription } from './model/useTranscription';
export { TranscriptionResumePrompt } from './ui/TranscriptionResumePrompt';
