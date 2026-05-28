/**
 * Cloud AI job polling budget on mobile. Keep in sync with web App Router
 * `export const maxDuration = 300` on `/api/messages`, `/api/ask`, `/api/digest`,
 * `/api/folders/auto-organize`, etc. (seconds).
 */
export const WEB_API_MAX_DURATION_SEC = 300;

export const AI_POLL_TIMEOUT_MS = WEB_API_MAX_DURATION_SEC * 1000;

/** Extra poll budget for async `meeting_dialogue` QStash job after summarize `done`. */
export const MEETING_DIALOGUE_POLL_EXTRA_MS = WEB_API_MAX_DURATION_SEC * 1000;

export function aiPollTimeoutMs(expectAsyncMeetingDialogue: boolean): number {
  return AI_POLL_TIMEOUT_MS + (expectAsyncMeetingDialogue ? MEETING_DIALOGUE_POLL_EXTRA_MS : 0);
}
