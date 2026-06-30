import { storage } from '@/shared/lib/async-storage';

const E2E_ACTIVE_KEY = 'e2e.active_v1';
const E2E_SKIP_ONBOARDING_KEY = 'e2e.skip_onboarding_v1';

export function setE2EActiveSync(active: boolean): void {
  if (active) {
    storage.set(E2E_ACTIVE_KEY, true);
  } else {
    storage.remove(E2E_ACTIVE_KEY);
  }
}

export function isE2EActiveSync(): boolean {
  return storage.getBoolean(E2E_ACTIVE_KEY) === true;
}

export function setE2ESkipOnboardingSync(skip: boolean): void {
  if (skip) {
    storage.set(E2E_SKIP_ONBOARDING_KEY, true);
  } else {
    storage.remove(E2E_SKIP_ONBOARDING_KEY);
  }
}

export function shouldE2ESkipOnboardingSync(): boolean {
  return storage.getBoolean(E2E_SKIP_ONBOARDING_KEY) === true;
}
