/** Minimum audio length for Whisper transcription (auto and manual). */
export const MIN_TRANSCRIBE_MS = 2_000;

/** Tail of prior transcript text passed as Whisper prompt between chunks. */
export const PROMPT_TAIL_LENGTH = 200;

/** Skip leading/trailing silence and silent chunks before Whisper when native VAD is available. */
export const TRANSCRIPTION_VAD_ENABLED = true;

export const WHISPER_IDLE_RELEASE_MS = 2 * 60 * 1000;
export const WHISPER_WARM_IDLE_RELEASE_MS = 5 * 60 * 1000;
export const WHISPER_LOW_POWER_IDLE_RELEASE_MS = 30 * 1000;

/** Grace period after JS transcription ends before Metal context may be released. */
export const WHISPER_NATIVE_SETTLE_MS = 500;

/** Extra grace after background abort so in-flight whisper_full can finish stopping. */
export const WHISPER_ABORT_SETTLE_MS = 2500;

/** Upper bound for manual restart cleanup after a paused/error transcription. */
export const WHISPER_RESTART_RESET_TIMEOUT_MS = 10_000;
