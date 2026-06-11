import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { PRO_LICENSE_MIN_FOREGROUND_REFRESH_MS } from '../lib/syncIntervals';
import { syncProLicenseFromServer } from '../lib/syncProLicenseFromServer';
import { useProActiveFromStorage } from './useProActiveFromStorage';

export type ProEntitlementRefreshOptions = {
  force?: boolean;
};

type ProEntitlementContextValue = {
  isProActive: boolean;
  expiresAtMs: number | null;
  refresh: (options?: ProEntitlementRefreshOptions) => Promise<void>;
  hydrated: boolean;
};

const ProEntitlementContext = createContext<ProEntitlementContextValue | null>(null);

export function ProEntitlementProvider({ children }: { children: React.ReactNode }) {
  const { isProActive, expiresAtMs } = useProActiveFromStorage();
  const [hydrated, setHydrated] = useState(false);
  const hasLeftActiveRef = useRef(false);
  const lastForegroundRefreshAtRef = useRef(0);
  const refreshInProgressRef = useRef(false);

  const refresh = useCallback(async (options?: ProEntitlementRefreshOptions) => {
    if (refreshInProgressRef.current && !options?.force) {
      return;
    }
    refreshInProgressRef.current = true;
    try {
      await syncProLicenseFromServer(options?.force === true);
      setHydrated(true);
    } finally {
      refreshInProgressRef.current = false;
    }
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
        if (refreshInProgressRef.current) {
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

  const value: ProEntitlementContextValue = {
    isProActive,
    expiresAtMs,
    refresh,
    hydrated,
  };

  return <ProEntitlementContext.Provider value={value}>{children}</ProEntitlementContext.Provider>;
}

export function useProEntitlement(): ProEntitlementContextValue {
  const ctx = useContext(ProEntitlementContext);
  if (ctx == null) {
    throw new Error('useProEntitlement must be used within ProEntitlementProvider');
  }
  return ctx;
}
