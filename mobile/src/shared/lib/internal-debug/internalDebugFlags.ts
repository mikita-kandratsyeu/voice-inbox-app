import { isInternalDebugBuild } from '@/shared/config/buildEnv';
import { storage } from '@/shared/lib/async-storage';

/** MMKV keys — versioned so toggles reset cleanly if semantics change. */
export const INTERNAL_DEBUG_FORCE_PRO_STORAGE_KEY = 'internal_debug_force_pro_v1';
export const INTERNAL_DEBUG_DISABLE_ADS_STORAGE_KEY = 'internal_debug_disable_ads_v1';

const DEBUG_PRO_EXPIRES_FAR_FUTURE_MS = 4102444800000;

export function getInternalDebugForceProSnapshot(): boolean {
  if (!isInternalDebugBuild()) return false;
  return storage.getBoolean(INTERNAL_DEBUG_FORCE_PRO_STORAGE_KEY) === true;
}

export function setInternalDebugForceProSync(value: boolean): void {
  if (!isInternalDebugBuild()) return;
  storage.set(INTERNAL_DEBUG_FORCE_PRO_STORAGE_KEY, value);
}

export function getInternalDebugDisableAdsSnapshot(): boolean {
  if (!isInternalDebugBuild()) return false;
  return storage.getBoolean(INTERNAL_DEBUG_DISABLE_ADS_STORAGE_KEY) === true;
}

export function setInternalDebugDisableAdsSync(value: boolean): void {
  if (!isInternalDebugBuild()) return;
  storage.set(INTERNAL_DEBUG_DISABLE_ADS_STORAGE_KEY, value);
}

/** When set, `getProExpiresAtMsSync` reports active Pro for entitlement checks. */
export function getInternalDebugProExpiresOverrideMs(): number | null {
  if (!getInternalDebugForceProSnapshot()) return null;
  return DEBUG_PRO_EXPIRES_FAR_FUTURE_MS;
}

export function subscribeInternalDebugForcePro(listener: () => void): () => void {
  const sub = storage.addOnValueChangedListener((key) => {
    if (key === INTERNAL_DEBUG_FORCE_PRO_STORAGE_KEY) listener();
  });
  return () => sub.remove();
}

export function subscribeInternalDebugDisableAds(listener: () => void): () => void {
  const sub = storage.addOnValueChangedListener((key) => {
    if (key === INTERNAL_DEBUG_DISABLE_ADS_STORAGE_KEY) listener();
  });
  return () => sub.remove();
}
