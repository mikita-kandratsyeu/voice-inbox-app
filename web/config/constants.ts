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
/** Mobile AI routes: which logical AI job this request is (see `web/lib/ai-operation.ts`). */
export const HEADER_AI_OPERATION = 'x-voice-inbox-ai-operation';

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
/** Staging payload for async AI workers (QStash / after). */
export const JOB_PAYLOAD_KEY_PREFIX = 'job-payload:';
/** Staging payload for the async meeting-dialogue worker (separate from summarize payload). */
export const MEETING_JOB_PAYLOAD_KEY_PREFIX = 'job-payload:meeting:';
/** QStash delivery retries when publishing async AI jobs. */
export const AI_JOB_QSTASH_RETRIES = 3;
/** Worker exclusive lock (`job-lock:*`). Slightly above App Router `maxDuration` (300s). */
export const JOB_LOCK_KEY_PREFIX = 'job-lock:';
export const JOB_LOCK_TTL_SECONDS = 330;
/** OpenRouter generation id for async recovery after worker timeout (`or-gen:*`). */
export const OPENROUTER_PENDING_GENERATION_KEY_PREFIX = 'or-gen:';
export const OPENROUTER_PENDING_GENERATION_TTL_SECONDS = JOB_LOCK_TTL_SECONDS;
/** Poll OpenRouter `/generation/content` when the live HTTP call fails but a generation id exists. */
export const OPENROUTER_GENERATION_RECOVERY_POLL_INTERVAL_MS = 2_000;
/** Poll `/generation/content` after transport failure (within one worker attempt). */
export const OPENROUTER_GENERATION_RECOVERY_MAX_WAIT_MS = 180_000;
/**
 * Above this size, meeting dialogue runs in a separate QStash job (own 300s).
 * At or below: inline second pass in the summarize worker (faster for short meetings).
 */
export const SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS = 10_000;
/** When using timed segments, omit duplicate full transcript from the meeting prompt above this size. */
export const MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS = 8_000;
/** Set on `msg:{id}` when the user cancels; worker must not run LLM or send push. */
export const AI_JOB_CANCELLED_ERROR = 'Cancelled by user';
export const JOB_CANCELLED_KEY_PREFIX = 'job-cancelled:';
/** Max length for optional device model string stored in push_token JSON. */
export const DEVICE_MODEL_MAX_CHARS = 128;
/** Push registration metadata (app / OS strings). */
export const PUSH_TOKEN_APP_VERSION_MAX_CHARS = 32;
export const PUSH_TOKEN_BUILD_NUMBER_MAX_CHARS = 32;
export const PUSH_TOKEN_OS_VERSION_MAX_CHARS = 64;
export const GET_RETRY_ATTEMPTS = 3;
export const GET_RETRY_DELAY_MS = 100;

/** System micro-tasks (folder organize, etc.). */
export const SYSTEM_MICRO_TASK_MODEL = 'google/gemini-2.5-flash-lite';

export const AI_MODEL_GEMINI_2_5_FLASH_LITE = 'google/gemini-2.5-flash-lite';
export const AI_MODEL_GEMINI_3_1_FLASH_LITE = 'google/gemini-3.1-flash-lite';
/** OpenRouter preview id — accepted from clients but always mapped to {@link AI_MODEL_GEMINI_3_1_FLASH_LITE} server-side. */
export const AI_MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW = 'google/gemini-3.1-flash-lite-preview';

/** Speaker-turn / pseudo-diarization pass (meeting_dialogue job); independent of user-selected summarize model. */
export const MEETING_DIALOGUE_MODEL = AI_MODEL_GEMINI_3_1_FLASH_LITE;

export const MEETING_DIALOGUE_MODEL_FALLBACK_CHAIN: readonly string[] = [
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_GEMINI_2_5_FLASH_LITE,
];

/** Map legacy / preview OpenRouter ids to the model id we actually call. */
export function normalizeIncomingAiModel(model: string): string {
  const t = model.trim();

  if (t === AI_MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW) {
    return AI_MODEL_GEMINI_3_1_FLASH_LITE;
  }

  if (t === LEGACY_AI_MODEL_STEP_3_5_FLASH) {
    return AI_MODEL_GEMINI_2_5_FLASH_LITE;
  }

  if (t === LEGACY_AI_MODEL_DEEPSEEK_V4_FLASH_NITRO) {
    return AI_MODEL_DEEPSEEK_V4_FLASH;
  }

  return t;
}
/** Manual picker, fallbacks, and auto medium tier. */
export const AI_MODEL_DEEPSEEK_V4_FLASH = 'deepseek/deepseek-v4-flash';
/** Legacy OpenRouter nitro suffix — mapped in {@link normalizeIncomingAiModel}. */
export const LEGACY_AI_MODEL_DEEPSEEK_V4_FLASH_NITRO = 'deepseek/deepseek-v4-flash:nitro';

/** Transcript translation: quality-first model chain (see translate.service). */
export const TRANSLATE_MODEL_CHAIN: readonly string[] = [
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_GEMINI_2_5_FLASH_LITE,
  AI_MODEL_DEEPSEEK_V4_FLASH,
];

/** Auto-routing short tier (OpenRouter). */
export const AI_MODEL_GPT_5_4_NANO = 'openai/gpt-5.4-nano';
export const AI_MODEL_MIMO_V2_5_PRO = 'xiaomi/mimo-v2.5-pro';
export const AI_MODEL_NEMOTRON_3_SUPER = 'nvidia/nemotron-3-super-120b-a12b';
/** Removed from catalog — accepted from old clients, mapped in {@link normalizeIncomingAiModel}. */
export const LEGACY_AI_MODEL_STEP_3_5_FLASH = 'stepfun/step-3.5-flash';

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
  AI_MODEL_GPT_5_4_NANO,
  AI_MODEL_MIMO_V2_5_PRO,
  AI_MODEL_NEMOTRON_3_SUPER,
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
