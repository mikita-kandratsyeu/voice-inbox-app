import { storage } from '@/shared/lib/async-storage';

export const PRO_ENTITLEMENT_STORAGE_KEY = 'pro_entitlement_expires_at_ms';
const KEY = PRO_ENTITLEMENT_STORAGE_KEY;

export function getProExpiresAtMsSync(): number | null {
  const n = storage.getNumber(KEY);
  if (n == null || n <= 0) return null;
  return n;
}

export function setProExpiresAtMsSync(ms: number): void {
  storage.set(KEY, ms);
}

export function clearProEntitlementSync(): void {
  storage.remove(KEY);
}

export function isProActiveFromStorageSync(): boolean {
  const ms = getProExpiresAtMsSync();
  return ms != null && ms > Date.now();
}
