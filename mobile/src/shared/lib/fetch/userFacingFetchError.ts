import { AI_POLL_TIMEOUT_ERROR } from '@/shared/lib/ai-api/pollGetLoop';
import { i18n } from '@/shared/lib/i18n';

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
