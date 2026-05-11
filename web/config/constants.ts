/** Apple App Store numeric id from an App Store / iTunes URL (e.g. …/app/name/id6745410910). */
export function extractAppleAppStoreId(storeUrl: string): string | undefined {
  const trimmed = storeUrl.trim();
  if (!trimmed || trimmed === '#') return undefined;
  const m = trimmed.match(/\/id(\d+)/i);
  return m?.[1];
}

// App config (from env)
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? '';
export const BASE_URL_OR_FALLBACK = BASE_URL || 'http://localhost:3000';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#';
export const GOOGLE_PLAY_URL = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? '#';
/** Shown on the landing page when `GOOGLE_PLAY_URL` is not a published store link. */
export const ANDROID_WAITLIST_URL = process.env.NEXT_PUBLIC_ANDROID_WAITLIST_URL?.trim() ?? '';

/** Public store or signup URLs from env (http/https only). */
export function isPublicHttpUrl(value: string | undefined | null): boolean {
  const t = (value ?? '').trim();
  return t.startsWith('https://') || t.startsWith('http://');
}

/** For Smart App Banner (`apple-itunes-app`). Override via env if the store URL has no `/id…` segment. */
export const APP_STORE_APP_ID: string | undefined =
  process.env.NEXT_PUBLIC_APP_STORE_APP_ID?.trim() ||
  extractAppleAppStoreId(process.env.NEXT_PUBLIC_APP_STORE_URL ?? '') ||
  undefined;
export const VERIFIED_METRICS_URL = process.env.NEXT_PUBLIC_VERIFIED_METRICS_URL?.trim() ?? '';

// HTTP headers
export const HEADER_SYNC_TOKEN = 'x-upstash-sync-token';
export const HEADER_DEVICE_ID = 'x-device-id';

// Rate limiting (proxy)
export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_MAX_REQUESTS = 15;
export const RATE_LIMIT_KEY_PREFIX = 'rl:';

// Per-device rate limit (mobile API)
export const RATE_LIMIT_DEVICE_KEY_PREFIX = 'rl_device:';
export const RATE_LIMIT_DEVICE_WINDOW_SECONDS = 60;
export const RATE_LIMIT_DEVICE_MAX_REQUESTS = 60;

// Support form (mobile) — per device, rolling window
export const SUPPORT_RATE_LIMIT_KEY_PREFIX = 'rl_support:';
export const SUPPORT_RATE_LIMIT_WINDOW_SECONDS = 3600;
export const SUPPORT_RATE_LIMIT_MAX_REQUESTS = 5;

// Admin login rate limit (per IP)
export const ADMIN_LOGIN_RATE_LIMIT_KEY_PREFIX = 'rl_admin_login:';
export const ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS = 60;
export const ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

// AI rate limit (defaults; overridable via AppConfig AI_WEEKLY_LIMIT_FREE / AI_WEEKLY_LIMIT_PRO)
export const FREE_WEEKLY_LIMIT = 10;
export const PRO_WEEKLY_LIMIT = 75;
export const AI_WEEKLY_KEY_PREFIX = 'ai_weekly:';
export const WEEK_TTL_SECONDS = 8 * 24 * 3600;
export const AI_BONUS_AMOUNT = 5;
export const AI_BONUS_COOLDOWN_KEY_PREFIX = 'ai_bonus_cooldown:';
export const AI_BONUS_COOLDOWN_SECONDS = 900; // 15 min

// Redis / KV — AI job payload keys (`msg:*`). Clients may request a shorter TTL (see MESSAGE_TTL_MIN_SECONDS).
export const MESSAGE_TTL_MIN_SECONDS = 300; // 5 minutes
export const MESSAGE_TTL_SECONDS = 3600; // default / max selectable (1 hour)
export const MESSAGE_KEY_PREFIX = 'msg:';
/** Max length for optional device model string stored in push_token JSON. */
export const DEVICE_MODEL_MAX_CHARS = 128;
/** Push registration metadata (app / OS strings). */
export const PUSH_TOKEN_APP_VERSION_MAX_CHARS = 32;
export const PUSH_TOKEN_BUILD_NUMBER_MAX_CHARS = 32;
export const PUSH_TOKEN_OS_VERSION_MAX_CHARS = 64;
export const GET_RETRY_ATTEMPTS = 3;
export const GET_RETRY_DELAY_MS = 100;

/** System micro-tasks (folder organize, translation primary, etc.). */
export const SYSTEM_MICRO_TASK_MODEL = 'google/gemini-2.5-flash-lite';

export const AI_MODEL_GEMINI_2_5_FLASH_LITE = 'google/gemini-2.5-flash-lite';
export const AI_MODEL_GEMINI_3_1_FLASH_LITE = 'google/gemini-3.1-flash-lite';
export const AI_MODEL_DEEPSEEK_V4_FLASH = 'deepseek/deepseek-v4-flash';

export const SYSTEM_TASK_MODEL_FALLBACK_CHAIN: readonly string[] = [
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_DEEPSEEK_V4_FLASH,
];

/**
 * When the user-selected chat model hits transport errors: same ordered fallbacks.
 */
export const USER_AI_MODEL_FALLBACK_CHAIN: readonly string[] = [
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_DEEPSEEK_V4_FLASH,
];

/** First step after primary failure (admin drafts, legacy single-fallback call sites). */
export const FALLBACK_MODEL = AI_MODEL_GEMINI_2_5_FLASH_LITE;

export const ALLOWED_AI_MODELS: string[] = [
  AI_MODEL_GEMINI_2_5_FLASH_LITE,
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  'minimax/minimax-m2.7',
  'google/gemini-2.5-flash-lite',
  AI_MODEL_DEEPSEEK_V4_FLASH,
];

// Push notifications (iOS APNs)
export const PUSH_TOKEN_KEY_PREFIX = 'push_token:';
export const PUSH_TOKEN_TTL_SECONDS = 30 * 24 * 3600; // 30 days
export const APP_FOREGROUND_KEY_PREFIX = 'app_foreground:';
export const APP_FOREGROUND_TTL_SECONDS = 60; // heartbeat every 40s, TTL 60s for safety margin

// Push deduplication: batch multiple AI completions into one push
export const PUSH_PENDING_KEY_PREFIX = 'push_pending:';
export const PUSH_LOCK_KEY_PREFIX = 'push_lock:';
export const PUSH_DEBOUNCE_MS = 15_000; // wait 15s to collect completions; leader re-checks foreground before sending
export const PUSH_PENDING_TTL_SECONDS = 120; // safety TTL for pending counter
export const PUSH_LOCK_TTL_SECONDS = 30; // lock TTL = debounce + buffer

// Limit exceeded push: max 1 per device per 5 min to avoid spam
export const LIMIT_PUSH_DEBOUNCE_KEY_PREFIX = 'limit_push_sent:';
export const LIMIT_PUSH_DEBOUNCE_SECONDS = 300;

// Pro license key redeem (brute-force protection)
export const PRO_LICENSE_REDEEM_KEY_PREFIX = 'rl_pro_redeem:';
export const PRO_LICENSE_REDEEM_WINDOW_SECONDS = 3600;
export const PRO_LICENSE_REDEEM_MAX_ATTEMPTS = 30;

// Admin panel: HTTP-only cookie storing signed admin JWT
export const ADMIN_COOKIE_NAME = 'admin_key';
