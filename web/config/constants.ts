// App config (from env)
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? '';
export const BASE_URL_OR_FALLBACK = BASE_URL || 'http://localhost:3000';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#';
export const GOOGLE_PLAY_URL = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? '#';

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

// AI rate limit
export const FREE_WEEKLY_LIMIT = 20;
export const AI_WEEKLY_KEY_PREFIX = 'ai_weekly:';
export const WEEK_TTL_SECONDS = 8 * 24 * 3600;
export const AI_BONUS_AMOUNT = 5;
export const AI_BONUS_COOLDOWN_KEY_PREFIX = 'ai_bonus_cooldown:';
export const AI_BONUS_COOLDOWN_SECONDS = 900; // 15 min

// Redis / KV
export const MESSAGE_TTL_SECONDS = 3600;
export const MESSAGE_KEY_PREFIX = 'msg:';
export const GET_RETRY_ATTEMPTS = 3;
export const GET_RETRY_DELAY_MS = 100;

// AI service — allowlist must match mobile AI_MODELS (entities/settings/model/constants.ts)
export const FALLBACK_MODEL = 'arcee-ai/trinity-large-preview:free';
export const ALLOWED_AI_MODELS: string[] = [
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-2.5-flash-lite',
  'deepseek/deepseek-v3.2',
  'openai/gpt-5-nano',
  FALLBACK_MODEL,
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

// Admin panel: HTTP-only cookie storing signed admin JWT
export const ADMIN_COOKIE_NAME = 'admin_key';
