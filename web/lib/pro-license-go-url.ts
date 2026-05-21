import { BASE_URL_OR_FALLBACK } from '@/config/constants';

/** Universal link for voucher QR codes — App Store (iOS), Google Play or Android waitlist. */
export function getProLicenseVoucherScanUrl(keyId: string): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  const id = keyId.trim();
  if (!id) return `${base}/go`;
  const q = new URLSearchParams({ voucher: id });
  return `${base}/go?${q.toString()}`;
}
