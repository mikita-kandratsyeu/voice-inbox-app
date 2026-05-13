import { storage } from '@/shared/lib/async-storage';
import {
  getInternalDebugProExpiresOverrideMs,
  INTERNAL_DEBUG_FORCE_PRO_STORAGE_KEY,
} from '@/shared/lib/internal-debug/internalDebugFlags';

export const PRO_ENTITLEMENT_SERVER_STORAGE_KEY = 'pro_entitlement_server_expires_at_ms';
export const PRO_ENTITLEMENT_RC_STORAGE_KEY = 'pro_entitlement_rc_expires_at_ms';

export function proEntitlementStorageKeyAffectsEntitlement(key: string): boolean {
  return (
    key === PRO_ENTITLEMENT_SERVER_STORAGE_KEY ||
    key === PRO_ENTITLEMENT_RC_STORAGE_KEY ||
    key === INTERNAL_DEBUG_FORCE_PRO_STORAGE_KEY
  );
}

function getServerMsSync(): number | null {
  const n = storage.getNumber(PRO_ENTITLEMENT_SERVER_STORAGE_KEY);
  if (n == null || n <= 0) return null;
  return n;
}

function getRcMsSync(): number | null {
  const n = storage.getNumber(PRO_ENTITLEMENT_RC_STORAGE_KEY);
  if (n == null || n <= 0) return null;
  return n;
}

/** Effective expiry: max of server (license/API) and store (RevenueCat). */
export function getProExpiresAtMsSync(): number | null {
  const server = getServerMsSync();
  const rc = getRcMsSync();

  let base: number | null;
  if (server == null && rc == null) base = null;
  else if (server == null) base = rc;
  else if (rc == null) base = server;
  else base = Math.max(server, rc);

  const debugOverride = getInternalDebugProExpiresOverrideMs();
  if (debugOverride == null) return base;
  if (base == null) return debugOverride;
  return Math.max(base, debugOverride);
}

export function setProServerExpiresAtMsSync(ms: number): void {
  storage.set(PRO_ENTITLEMENT_SERVER_STORAGE_KEY, ms);
}

export function setProRcExpiresAtMsSync(ms: number): void {
  storage.set(PRO_ENTITLEMENT_RC_STORAGE_KEY, ms);
}

export function clearProServerEntitlementSync(): void {
  storage.remove(PRO_ENTITLEMENT_SERVER_STORAGE_KEY);
}

export function clearProRcEntitlementSync(): void {
  storage.remove(PRO_ENTITLEMENT_RC_STORAGE_KEY);
}

export function clearProEntitlementSync(): void {
  storage.remove(PRO_ENTITLEMENT_SERVER_STORAGE_KEY);
  storage.remove(PRO_ENTITLEMENT_RC_STORAGE_KEY);
}

export function isProActiveFromStorageSync(): boolean {
  const ms = getProExpiresAtMsSync();
  return ms != null && ms > Date.now();
}
