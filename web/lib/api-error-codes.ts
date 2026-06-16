/**
 * Machine-readable `code` values for JSON API error bodies.
 * Human-readable copy stays in `error`; optional `usage` / `details` are unchanged for clients that already parse them.
 */
export const ApiErrorCode = {
  Unauthorized: 'unauthorized',
  Forbidden: 'forbidden',
  ForbiddenDeviceMismatch: 'forbidden_device_mismatch',
  MobileUserAgentNotConfigured: 'mobile_user_agent_not_configured',
  MobileUserAgentMismatch: 'mobile_user_agent_mismatch',
  InvalidDeviceId: 'invalid_device_id',
  InvalidJson: 'invalid_json',
  ValidationError: 'validation_error',
  InvalidModel: 'invalid_model',
  ProModelRequired: 'pro_model_required',
  PayloadTooLarge: 'payload_too_large',
  DeviceRateLimited: 'device_rate_limited',
  WeeklyAiLimit: 'weekly_ai_limit',
  /** Generic rate limit (e.g. pro license redeem). */
  RateLimit: 'rate_limit',
  SupportRateLimited: 'support_rate_limited',
  PublishRateLimited: 'publish_rate_limited',
  DuplicateId: 'duplicate_id',
  NotFound: 'not_found',
  ServiceUnavailable: 'service_unavailable',
  InvalidTargetLanguage: 'invalid_target_language',
  TranslationFailed: 'translation_failed',
  MissingSystemPrompt: 'missing_system_prompt',

  /** Admin login / session bootstrap. */
  AdminNotConfigured: 'admin_not_configured',
  AdminDatabaseError: 'admin_database_error',
  AdminJwtMisconfigured: 'admin_jwt_misconfigured',
  AdminInvalidCredentials: 'admin_invalid_credentials',

  /** RevenueCat webhook handler. */
  WebhookNotConfigured: 'webhook_not_configured',
  WebhookServerError: 'webhook_server_error',

  /** Pro / IAP edge cases (machine codes match prior JSON where applicable). */
  IapActive: 'iap_active',
  BonusNoUsage: 'bonus_no_usage',
  BonusCooldown: 'bonus_cooldown',
  ProRequired: 'pro_required',
  ProResetLimitNotExhausted: 'pro_reset_limit_not_exhausted',
  ProResetInvalidProduct: 'pro_reset_invalid_product',
  ProResetPurchaseNotFound: 'pro_reset_purchase_not_found',
  ProResetTransactionUsed: 'pro_reset_transaction_used',
  ProResetNotConfigured: 'pro_reset_not_configured',
} as const;

export type ApiErrorCodeValue = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
