import { i18n } from '@/shared/lib/i18n';

function looksLikeIosNetworkErrorDump(message: string): boolean {
  return (
    message.includes('NSURLErrorDomain') ||
    message.includes('kCFErrorDomainCFNetwork') ||
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
