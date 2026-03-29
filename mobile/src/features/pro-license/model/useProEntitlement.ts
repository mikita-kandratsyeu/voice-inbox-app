import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { storage } from '@/shared/lib/async-storage';

import { getProExpiresAtMsSync, PRO_ENTITLEMENT_STORAGE_KEY } from '../lib/proEntitlementStorage';
import { PRO_LICENSE_MIN_FOREGROUND_REFRESH_MS } from '../lib/syncIntervals';
import { syncProLicenseFromServer } from '../lib/syncProLicenseFromServer';

function subscribeStorage(callback: () => void): () => void {
  const sub = storage.addOnValueChangedListener((key) => {
    if (key === PRO_ENTITLEMENT_STORAGE_KEY) {
      callback();
    }
  });
  return () => sub.remove();
}

function getExpiresSnapshot(): number | null {
  return getProExpiresAtMsSync();
}

export type ProEntitlementRefreshOptions = {
  force?: boolean;
};

export function useProEntitlement(): {
  isProActive: boolean;
  expiresAtMs: number | null;
  refresh: (options?: ProEntitlementRefreshOptions) => Promise<void>;
  hydrated: boolean;
} {
  const expiresAtMs = useSyncExternalStore(
    subscribeStorage,
    getExpiresSnapshot,
    getExpiresSnapshot,
  );
  const [hydrated, setHydrated] = useState(false);
  const hasLeftActiveRef = useRef(false);
  const lastForegroundRefreshAtRef = useRef(0);

  const isProActive = expiresAtMs != null && expiresAtMs > Date.now();

  const refresh = useCallback(async (options?: ProEntitlementRefreshOptions) => {
    await syncProLicenseFromServer(options?.force === true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        if (!hasLeftActiveRef.current) {
          return;
        }
        const now = Date.now();
        const lastFg = lastForegroundRefreshAtRef.current;
        if (lastFg > 0 && now - lastFg < PRO_LICENSE_MIN_FOREGROUND_REFRESH_MS) {
          return;
        }
        lastForegroundRefreshAtRef.current = now;
        void refresh();
        return;
      }
      if (s === 'background' || s === 'inactive') {
        hasLeftActiveRef.current = true;
      }
    });
    return () => sub.remove();
  }, [refresh]);

  return {
    isProActive,
    expiresAtMs,
    refresh,
    hydrated,
  };
}
