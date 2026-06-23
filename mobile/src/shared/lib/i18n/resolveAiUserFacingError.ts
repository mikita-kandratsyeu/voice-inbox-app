import { i18n } from '@/shared/lib/i18n';

const AI_USER_ERROR_KEYS = [
  'ai.limitWeeklyExceeded',
  'ai.limitWeeklyExceededPro',
  'ai.privateModeUnavailable',
  'ai.privateModeModelNotDownloaded',
  'ai.privateModeLimitedTooLong',
  'ai.privateModeParseFailed',
  'ai.privateModeEmptyAnswer',
  'ai.privateModeUnsupportedLocale',
  'ai.privateModeTooLongForLocal',
  'ai.privateModeGenericError',
  'ai.privateModeRemoteConfigMissing',
  'ai.privateRemoteServerTimeout',
  'ai.privateRemoteContextTooLong',
  'ai.smartModeNetworkError',
  'ai.modelResponseInvalid',
  'inboxAsk.privateDeviceUnavailable',
  'recordingDetail.privateModeErrorHint',
] as const;

/**
 * Re-localize persisted AI errors (stored in another locale) for the current UI language.
 */
export function resolveAiUserFacingError(message: string | null | undefined): string {
  const trimmed = message?.trim() ?? '';
  if (!trimmed) return '';

  for (const key of AI_USER_ERROR_KEYS) {
    const en = i18n.getFixedT('en')(key);
    const ru = i18n.getFixedT('ru')(key);
    if (trimmed === en || trimmed === ru) {
      return i18n.t(key);
    }
  }

  return trimmed;
}
