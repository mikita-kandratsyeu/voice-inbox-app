import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { fetchProLicenseStatus } from '@/shared/lib/ai-api/aiApi';
import { storage } from '@/shared/lib/async-storage';

import {
  clearProEntitlementSync,
  getProExpiresAtMsSync,
  PRO_ENTITLEMENT_STORAGE_KEY,
  setProExpiresAtMsSync,
} from '../lib/proEntitlementStorage';

const MIN_BACKGROUND_FETCH_INTERVAL_MS = 45_000;
const MIN_ATTEMPT_INTERVAL_MS = 12_000;

let lastSuccessfulFetchAt = 0;
let lastAttemptAt = 0;
let syncTail: Promise<void> = Promise.resolve();

function syncProLicenseFromServer(force: boolean): Promise<void> {
  const run = syncTail.then(async () => {
    const now = Date.now();
    if (
      !force &&
      lastSuccessfulFetchAt > 0 &&
      now - lastSuccessfulFetchAt < MIN_BACKGROUND_FETCH_INTERVAL_MS
    ) {
      return;
    }
    if (!force && lastAttemptAt > 0 && now - lastAttemptAt < MIN_ATTEMPT_INTERVAL_MS) {
      return;
    }
    lastAttemptAt = now;

    const status = await fetchProLicenseStatus();
    if (status == null) {
      return;
    }
    if (status.active && status.expiresAt) {
      const ms = new Date(status.expiresAt).getTime();
      if (Number.isFinite(ms) && ms > Date.now()) {
        setProExpiresAtMsSync(ms);
      } else {
        clearProEntitlementSync();
      }
    } else {
      clearProEntitlementSync();
    }
    lastSuccessfulFetchAt = Date.now();
  });
  syncTail = run.catch(() => {});
  return run;
}

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
        void refresh();
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
