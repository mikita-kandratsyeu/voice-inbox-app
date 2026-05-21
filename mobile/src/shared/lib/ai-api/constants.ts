/**
 * Cloud AI job polling budget on mobile. Keep in sync with web App Router
 * `export const maxDuration = 300` on `/api/messages`, `/api/ask`, `/api/digest`,
 * `/api/folders/auto-organize`, etc. (seconds).
 */
export const WEB_API_MAX_DURATION_SEC = 300;

export const AI_POLL_TIMEOUT_MS = WEB_API_MAX_DURATION_SEC * 1000;
