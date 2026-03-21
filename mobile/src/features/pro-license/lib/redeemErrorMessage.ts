import type { TFunction } from 'i18next';

import type { ProLicenseRedeemErrorCode } from '@/shared/lib/ai-api/aiApi';

const I18N_KEY: Record<ProLicenseRedeemErrorCode, string> = {
  invalid_key: 'proLicense.errors.invalidKey',
  used_elsewhere: 'proLicense.errors.usedElsewhere',
  server_error: 'proLicense.errors.serverError',
  rate_limit: 'proLicense.errors.rateLimit',
  activation_failed: 'proLicense.errors.activationFailed',
  invalid_response: 'proLicense.errors.invalidResponse',
  network: 'proLicense.errors.network',
};

export function proLicenseMessageForRedeemError(
  t: TFunction,
  result: { ok: false; error: string; code?: ProLicenseRedeemErrorCode },
): string {
  if (result.code != null && result.code in I18N_KEY) {
    return t(I18N_KEY[result.code], { defaultValue: result.error });
  }
  return t('proLicense.errors.activationFailed', { defaultValue: result.error });
}
