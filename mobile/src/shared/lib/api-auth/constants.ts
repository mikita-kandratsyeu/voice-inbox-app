/** Default per-request timeout for Web API calls (fail fast when offline vs native ~60s). */
export const WEB_API_FETCH_TIMEOUT_MS = 15_000;

/** Per poll attempt when waiting for async AI jobs; loop retries within AI_POLL_TIMEOUT_MS. */
export const WEB_API_POLL_FETCH_TIMEOUT_MS = 12_000;
