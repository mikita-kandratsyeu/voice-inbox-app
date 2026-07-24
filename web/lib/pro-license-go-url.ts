import { getGoStoreScanUrl } from '@/lib/go-store-scan-url';

/** Universal link for voucher QR codes — App Store (iOS), Google Play or Android waitlist. */
export function getProLicenseVoucherScanUrl(keyId: string): string {
  const id = keyId.trim();
  if (!id) return getGoStoreScanUrl();
  const q = new URLSearchParams({ voucher: id });
  return `${getGoStoreScanUrl()}?${q.toString()}`;
}
