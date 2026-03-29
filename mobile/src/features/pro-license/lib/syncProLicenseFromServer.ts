import { fetchProLicenseStatus } from '@/shared/lib/ai-api/proLicenseApi';

import { clearProEntitlementSync, setProExpiresAtMsSync } from './proEntitlementStorage';
import { PRO_LICENSE_MIN_ATTEMPT_MS, PRO_LICENSE_MIN_BACKGROUND_FETCH_MS } from './syncIntervals';

let lastSuccessfulFetchAt = 0;
let lastAttemptAt = 0;
let syncTail: Promise<void> = Promise.resolve();

export function syncProLicenseFromServer(force: boolean): Promise<void> {
  const run = syncTail.then(async () => {
    const now = Date.now();
    if (
      !force &&
      lastSuccessfulFetchAt > 0 &&
      now - lastSuccessfulFetchAt < PRO_LICENSE_MIN_BACKGROUND_FETCH_MS
    ) {
      return;
    }

    if (!force && lastAttemptAt > 0 && now - lastAttemptAt < PRO_LICENSE_MIN_ATTEMPT_MS) {
      return;
    }

    lastAttemptAt = now;

    const status = await fetchProLicenseStatus({ force });
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
