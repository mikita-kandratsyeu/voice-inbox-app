/**
 * Cloud AI job polling fallback on mobile when the server omits `pollExpiresAt`.
 * Keep in sync with web `AI_WORKER_MAX_DURATION_SEC` and App Router `maxDuration`.
 */
export const WEB_API_MAX_DURATION_SEC = 300;

export const AI_POLL_TIMEOUT_MS = WEB_API_MAX_DURATION_SEC * 1000;

/** Extra poll budget for async `meeting_dialogue` QStash job after summarize `done`. */
export const MEETING_DIALOGUE_POLL_EXTRA_MS = WEB_API_MAX_DURATION_SEC * 1000;

export function aiPollTimeoutMs(expectAsyncMeetingDialogue: boolean): number {
  return AI_POLL_TIMEOUT_MS + (expectAsyncMeetingDialogue ? MEETING_DIALOGUE_POLL_EXTRA_MS : 0);
}

/** Cap poll budget when resuming a job after app restart (server may already be done). */
export const AI_RESUME_POLL_MAX_MS = 120_000;

export function aiResumePollTimeoutMs(
  expectAsyncMeetingDialogue: boolean,
  expiresAtMs: number,
): number {
  const remaining = Math.max(0, expiresAtMs - Date.now());
  const capped = Math.min(AI_RESUME_POLL_MAX_MS, remaining);
  if (expectAsyncMeetingDialogue) {
    return Math.min(capped + MEETING_DIALOGUE_POLL_EXTRA_MS, remaining);
  }
  return capped || AI_RESUME_POLL_MAX_MS;
}
