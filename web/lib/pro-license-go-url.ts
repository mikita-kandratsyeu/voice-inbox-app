import { BASE_URL_OR_FALLBACK } from '@/config/constants';

/** Universal link for voucher QR codes — redirects to App Store or Google Play by device. */
export function getProLicenseVoucherScanUrl(): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  return `${base}/go`;
}
