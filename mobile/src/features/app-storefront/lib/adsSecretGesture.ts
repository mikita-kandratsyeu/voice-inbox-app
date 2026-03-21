import { useEffect, useState } from 'react';

import { getAdsSecretGestureRaw } from '@/shared/config/runtimeConfig';
import { storage } from '@/shared/lib/async-storage';

const STORAGE_KEY = 'ads_force_disabled';

export function isAdsSecretGestureEnabled(): boolean {
  const raw = getAdsSecretGestureRaw().trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function getAdsForceDisabledSync(): boolean {
  if (!isAdsSecretGestureEnabled()) {
    return false;
  }
  return storage.getBoolean(STORAGE_KEY) ?? false;
}

export function toggleAdsForceDisabled(): boolean {
  const next = !getAdsForceDisabledSync();
  storage.set(STORAGE_KEY, next);
  return next;
}

export function useAdsForceDisabled(): boolean {
  const enabled = isAdsSecretGestureEnabled();
  const [forceDisabled, setForceDisabled] = useState(
    () => enabled && (storage.getBoolean(STORAGE_KEY) ?? false),
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const sub = storage.addOnValueChangedListener((key) => {
      if (key === STORAGE_KEY) {
        setForceDisabled(storage.getBoolean(STORAGE_KEY) ?? false);
      }
    });
    return () => sub.remove();
  }, [enabled]);

  return enabled ? forceDisabled : false;
}
