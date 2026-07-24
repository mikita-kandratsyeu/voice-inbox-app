import { AI_POLL_TIMEOUT_ERROR } from '@/shared/lib/ai-api/pollGetLoop';
import { i18n } from '@/shared/lib/i18n';

import { tryParseWebApiErrorBody, type WebApiErrorBody } from './parseWebApiError';

const API_ERROR_I18N_KEYS: Record<string, string> = {
  not_found: 'api.errors.notFound',
  unauthorized: 'api.errors.unauthorized',
  forbidden: 'api.errors.forbidden',
  forbidden_device_mismatch: 'api.errors.forbiddenDevice',
  device_rate_limited: 'api.errors.rateLimited',
  weekly_ai_limit: 'ai.limitWeeklyExceeded',
  service_unavailable: 'api.errors.serviceUnavailable',
  payload_too_large: 'api.errors.payloadTooLarge',
  validation_error: 'api.errors.validationError',
  invalid_json: 'api.errors.invalidRequest',
};

export function resolveWebApiErrorMessage(body: WebApiErrorBody): string {
  if (body.code && body.code in API_ERROR_I18N_KEYS) {
    return i18n.t(API_ERROR_I18N_KEYS[body.code]!);
  }

  const lower = body.error.toLowerCase();
  if (lower === 'not found') {
    return i18n.t('api.errors.notFound');
  }

  return i18n.t('api.errors.generic');
}

function looksLikeJsonParseFailure(message: string): boolean {
  return (
    /is not valid JSON/i.test(message) ||
    /^Unexpected token/i.test(message) ||
    message.startsWith('Invalid AI response')
  );
}

function looksLikeOpenRouterStreamFailure(message: string): boolean {
  return /OpenRouter stream error/i.test(message);
}

function looksLikeIosNetworkErrorDump(message: string): boolean {
  return (
    message.includes('NSURLErrorDomain') ||
    message.includes('kCFErrorDomainCFNetwork') ||
    message.includes('kCFErrorDomain-CFNetwork') ||
    message.includes('NSErrorFailingURLStringKey') ||
    message.includes('NSErrorFailingURLKey') ||
    message.includes('_NSURLErrorNWPathKey')
  );
}

export function toUserFacingFetchErrorMessage(message: string): string {
  const trimmed = message?.trim() ?? '';
  if (!trimmed) {
    return i18n.t('ai.smartModeNetworkError');
  }

  const apiError = tryParseWebApiErrorBody(trimmed);
  if (apiError) {
    return resolveWebApiErrorMessage(apiError);
  }

  if (looksLikeJsonParseFailure(trimmed) || looksLikeOpenRouterStreamFailure(trimmed)) {
    return i18n.t('ai.modelResponseInvalid');
  }

  if (trimmed === AI_POLL_TIMEOUT_ERROR) {
    return i18n.t('ai.modelResponseInvalid');
  }

  if (looksLikeIosNetworkErrorDump(trimmed)) {
    return i18n.t('ai.smartModeNetworkError');
  }

  if (trimmed.length > 280) {
    return i18n.t('ai.smartModeNetworkError');
  }

  return trimmed;
}

export function toUserFacingFetchErrorFromUnknown(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return toUserFacingFetchErrorMessage(raw);
}
