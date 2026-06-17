/** Default per-request timeout for Web API calls (fail fast when offline vs native ~60s). */
export const WEB_API_FETCH_TIMEOUT_MS = 15_000;

/** Token exchange on cold start (App Check + preview API wake-up can exceed 15s). */
export const WEB_API_TOKEN_FETCH_TIMEOUT_MS = 30_000;

/** Retries for `POST /api/token` on transient network errors. */
export const TOKEN_FETCH_MAX_ATTEMPTS = 3;

export const TOKEN_FETCH_RETRY_BASE_DELAY_MS = 1_500;

/** Per poll attempt when waiting for async AI jobs; loop retries within AI_POLL_TIMEOUT_MS. */
export const WEB_API_POLL_FETCH_TIMEOUT_MS = 12_000;
