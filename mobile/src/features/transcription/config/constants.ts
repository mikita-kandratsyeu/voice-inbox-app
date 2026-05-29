export const WHISPER_IDLE_RELEASE_MS = 2 * 60 * 1000;

/** Grace period after JS transcription ends before Metal context may be released. */
export const WHISPER_NATIVE_SETTLE_MS = 500;

/** Extra grace after background abort so in-flight whisper_full can finish stopping. */
export const WHISPER_ABORT_SETTLE_MS = 2500;
