export {
  REMOTE_SYNC_DEFAULT_BRANCH as GITHUB_SYNC_DEFAULT_BRANCH,
  REMOTE_SYNC_DEFAULT_REPO_NAME as GITHUB_SYNC_DEFAULT_REPO_NAME,
  REMOTE_SYNC_DEFAULT_BASE_PATH as GITHUB_SYNC_DEFAULT_BASE_PATH,
  REMOTE_SYNC_LEGACY_MANIFEST_FILE as GITHUB_SYNC_LEGACY_MANIFEST_FILE,
  REMOTE_SYNC_MANIFEST_FILE as GITHUB_SYNC_MANIFEST_FILE,
  REMOTE_SYNC_HEAD_FILE as GITHUB_SYNC_HEAD_FILE,
  REMOTE_SYNC_NOTES_DIR as GITHUB_SYNC_NOTES_DIR,
  REMOTE_SYNC_README_FILE as GITHUB_SYNC_README_FILE,
  REMOTE_SYNC_HEAD_FORMAT_VERSION as GITHUB_HEAD_FORMAT_VERSION,
  REMOTE_SYNC_STRUCTURE_VERSION as GITHUB_SYNC_STRUCTURE_VERSION,
} from '@/features/git-remote-sync/lib/constants';

export const GITHUB_OAUTH_SCOPE = 'repo';
export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

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
