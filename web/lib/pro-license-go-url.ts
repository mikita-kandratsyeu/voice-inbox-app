import { BASE_URL_OR_FALLBACK } from '@/config/constants';

/** Universal link for voucher QR codes — App Store (iOS), Google Play or Android waitlist. */
export function getProLicenseVoucherScanUrl(): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  return `${base}/go`;
}
