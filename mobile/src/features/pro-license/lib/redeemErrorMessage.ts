import type { TFunction } from 'i18next';

import type { ProLicenseRedeemErrorCode } from '@/shared/lib/ai-api/proLicenseApi';

const I18N_KEY: Record<ProLicenseRedeemErrorCode, string> = {
  invalid_key: 'proLicense.errors.invalidKey',
  used_elsewhere: 'proLicense.errors.usedElsewhere',
  server_error: 'proLicense.errors.serverError',
  rate_limit: 'proLicense.errors.rateLimit',
  activation_failed: 'proLicense.errors.activationFailed',
  invalid_response: 'proLicense.errors.invalidResponse',
  network: 'proLicense.errors.network',
  iap_active: 'proLicense.errors.activationFailed',
};

const VOUCHER_I18N_KEY: Record<ProLicenseRedeemErrorCode, string> = {
  invalid_key: 'proLicense.voucher.errors.invalidKey',
  used_elsewhere: 'proLicense.voucher.errors.usedElsewhere',
  server_error: 'proLicense.voucher.errors.serverError',
  rate_limit: 'proLicense.voucher.errors.rateLimit',
  activation_failed: 'proLicense.voucher.errors.activationFailed',
  invalid_response: 'proLicense.voucher.errors.invalidResponse',
  network: 'proLicense.voucher.errors.network',
  iap_active: 'proLicense.voucher.errors.activationFailed',
};

export function proLicenseMessageForRedeemError(
  t: TFunction,
  result: { ok: false; error: string; code?: ProLicenseRedeemErrorCode },
  options?: { voucher?: boolean },
): string {
  const keys = options?.voucher === true ? VOUCHER_I18N_KEY : I18N_KEY;
  const fallback =
    options?.voucher === true
      ? 'proLicense.voucher.errors.activationFailed'
      : 'proLicense.errors.activationFailed';

  if (result.code != null && result.code in keys) {
    return t(keys[result.code], { defaultValue: result.error });
  }
  return t(fallback, { defaultValue: result.error });
}
