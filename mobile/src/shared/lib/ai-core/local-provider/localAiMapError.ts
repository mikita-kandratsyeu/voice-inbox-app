import { i18n } from '@/shared/lib';

import { LocalAiError } from './localAiErrors';

export function mapLocalError(err: unknown): string {
  if (err instanceof LocalAiError) {
    switch (err.code) {
      case 'model_not_downloaded':
        return i18n.t('ai.privateModeModelNotDownloaded');
      case 'parse_failed':
        return i18n.t('ai.privateModeParseFailed');
      case 'empty_summary':
        return i18n.t('ai.privateModeParseFailed');
      case 'empty_answer':
        return i18n.t('ai.privateModeEmptyAnswer');
      case 'transcript_too_long':
        return i18n.t('ai.privateModeTooLongForLocal');
      case 'generic':
      default:
        return i18n.t('ai.privateModeGenericError');
    }
  }

  if (err instanceof SyntaxError) {
    return i18n.t('ai.privateModeParseFailed');
  }

  const message = err instanceof Error ? err.message : String(err);
  const normalized = message.toLowerCase();

  if (message.includes('privateModeModelNotDownloaded')) {
    return i18n.t('ai.privateModeModelNotDownloaded');
  }

  if (
    message.includes('Local LLM model file missing') ||
    normalized.includes('model file missing')
  ) {
    return i18n.t('ai.privateModeModelNotDownloaded');
  }

  if (
    message.includes('Invalid local summary response') ||
    message.includes('Local summary is empty')
  ) {
    return i18n.t('ai.privateModeParseFailed');
  }

  if (message.includes('Local answer is empty')) {
    return i18n.t('ai.privateModeEmptyAnswer');
  }

  if (message.includes('Local prompt too long for current model context')) {
    return i18n.t('ai.privateModeTooLongForLocal');
  }

  return i18n.t('ai.privateModeGenericError');
}
