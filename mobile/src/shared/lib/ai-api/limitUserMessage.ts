import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { i18n } from '@/shared/lib/i18n';

export function getAiWeeklyLimitExceededMessage(): string {
  if (isProActiveFromStorageSync()) {
    return i18n.t('ai.limitWeeklyExceededPro');
  }
  return i18n.t('ai.limitWeeklyExceeded');
}

export function getAutoOrganizeWeeklyLimitExceededMessage(): string {
  return i18n.t('folders.autoOrganizeLimitExceededDescription');
}
