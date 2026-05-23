import { useSyncExternalStore } from 'react';

import { storage } from '@/shared/lib/async-storage';

import {
  getProExpiresAtMsSync,
  proEntitlementStorageKeyAffectsEntitlement,
} from '../lib/proEntitlementStorage';

function subscribeProEntitlement(callback: () => void): () => void {
  const sub = storage.addOnValueChangedListener((key) => {
    if (proEntitlementStorageKeyAffectsEntitlement(key)) {
      callback();
    }
  });
  return () => sub.remove();
}

function getProExpiresSnapshot(): number | null {
  return getProExpiresAtMsSync();
}

/** Read-only Pro status from local storage — no network sync. */
export function useProActiveFromStorage(): {
  isProActive: boolean;
  expiresAtMs: number | null;
} {
  const expiresAtMs = useSyncExternalStore(
    subscribeProEntitlement,
    getProExpiresSnapshot,
    getProExpiresSnapshot,
  );
  const isProActive = expiresAtMs != null && expiresAtMs > Date.now();
  return { isProActive, expiresAtMs };
}
