export {
  detectDevicePerformanceTier,
  type DevicePerformanceProfile,
  type DevicePerformanceTier,
  getAdaptiveCheckpointInterval,
  getDevicePerformanceProfile,
} from './lib/devicePerformanceProfile';
export { MIN_TRANSCRIBE_MS } from './config/constants';
export { getWhisperContext, releaseWhisperContext } from './lib/initWhisper';
export { notifyAutoTranscriptionTooShort } from './lib/notifyAutoTranscriptionTooShort';
export {
  tryScheduleAutoTranscription,
  type AutoTranscriptionScheduleResult,
} from './lib/scheduleAutoTranscription';
export { isTooShortForTranscription } from './lib/transcriptionDuration';
export { transcribeAudio } from './lib/transcribeAudio';
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
export { useTranscription, type StartTranscriptionOptions } from './model/useTranscription';
export { TranscriptionResumePrompt } from './ui/TranscriptionResumePrompt';
