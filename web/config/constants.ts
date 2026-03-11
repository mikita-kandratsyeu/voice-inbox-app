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

// AI rate limit
export const FREE_WEEKLY_LIMIT = 50;
export const AI_WEEKLY_KEY_PREFIX = 'ai_weekly:';
export const WEEK_TTL_SECONDS = 8 * 24 * 3600;

// Redis / KV
export const MESSAGE_TTL_SECONDS = 3600;
export const MESSAGE_KEY_PREFIX = 'msg:';
export const GET_RETRY_ATTEMPTS = 3;
export const GET_RETRY_DELAY_MS = 100;

// AI service
export const FALLBACK_MODEL = 'arcee-ai/trinity-large-preview:free';
