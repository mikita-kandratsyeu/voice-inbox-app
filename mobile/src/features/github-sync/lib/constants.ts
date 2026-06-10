export const GITHUB_SYNC_DEFAULT_BRANCH = 'voice-inbox-ai-sync';
export const GITHUB_SYNC_DEFAULT_REPO_NAME = 'voice-inbox-ai';
export const GITHUB_SYNC_DEFAULT_BASE_PATH = GITHUB_SYNC_DEFAULT_REPO_NAME;
export const GITHUB_SYNC_MANIFEST_FILE = 'manifest.json';
export const GITHUB_SYNC_HEAD_FILE = '.voice-inbox-ai/HEAD.json';
export const GITHUB_SYNC_NOTES_DIR = 'notes';
export const GITHUB_SYNC_README_FILE = 'README.md';
export const GITHUB_OAUTH_SCOPE = 'repo';
export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_HEAD_FORMAT_VERSION = 1;

/** Per-request GitHub API timeout (prevents one hung call from blocking sync). */
export const GITHUB_FETCH_TIMEOUT_MS = 60_000;

/** Retries for transient GitHub API failures (rate limit / gateway errors). */
export const GITHUB_FETCH_MAX_RETRIES = 3;

/** Base delay before retrying a failed GitHub API request. */
export const GITHUB_FETCH_RETRY_BASE_MS = 1_000;

/** Max attempts to resolve a ref update conflict during sync. */
export const GITHUB_REF_CONFLICT_MAX_RETRIES = 3;

/** Overall sync operation budget (snapshot + blobs + commit). */
export const GITHUB_SYNC_TIMEOUT_MS = 180_000;

/** Minimum gap between manual sync attempts to avoid hammering GitHub. */
export const GITHUB_SYNC_COOLDOWN_MS = 30_000;
