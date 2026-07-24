import { BASE_URL_OR_FALLBACK, GO_STORE_REDIRECT_PATH } from '@/config/constants';

/** Absolute URL encoded in landing / voucher QR codes — OS-aware redirect via `/go`. */
export function getGoStoreScanUrl(): string {
  return `${BASE_URL_OR_FALLBACK.replace(/\/$/, '')}${GO_STORE_REDIRECT_PATH}`;
}
