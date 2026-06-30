import { useAppLockStore } from '@/entities/app-lock';
import {
  setHasSeenOnboarding,
  setTermsAgreedAt,
} from '@/features/onboarding/lib/onboardingStorage';
import { useOnboardingStore } from '@/features/onboarding/model/store';
import {
  setInternalDebugDisableAdsSync,
  setInternalDebugForceProSync,
} from '@/shared/lib/internal-debug/internalDebugFlags';

import { setE2EActiveSync, setE2ESkipOnboardingSync } from './e2eStorage';
import { isE2EAllowed } from './isE2EAllowed';

export type E2EConfigParams = {
  skipOnboarding?: boolean;
  skipAppLock?: boolean;
  mockPro?: boolean;
  disableAds?: boolean;
  /** Re-show onboarding with the Skip button visible (returning-user path). */
  prepareSkipUi?: boolean;
};

export async function applyE2EConfig(params: E2EConfigParams = {}): Promise<void> {
  if (!isE2EAllowed()) {
    return;
  }

  const skipOnboarding = params.skipOnboarding !== false;
  const skipAppLock = params.skipAppLock !== false;

  setE2EActiveSync(true);
  setE2ESkipOnboardingSync(skipOnboarding);

  if (params.prepareSkipUi && !skipOnboarding) {
    setHasSeenOnboarding();
    useOnboardingStore.setState({ hasSeenOnboarding: true, forceShow: true });
  } else if (skipOnboarding) {
    setHasSeenOnboarding();
    setTermsAgreedAt();
    useOnboardingStore.getState().markOnboardingComplete();
    useOnboardingStore.getState().setForceShow(false);
  }

  if (skipAppLock) {
    await useAppLockStore.getState().setEnabled(false);
  }

  if (params.mockPro) {
    setInternalDebugForceProSync(true);
  }

  if (params.disableAds) {
    setInternalDebugDisableAdsSync(true);
  }
}

export async function resetE2EState(params: E2EConfigParams = {}): Promise<void> {
  await applyE2EConfig({
    skipOnboarding: true,
    skipAppLock: true,
    mockPro: params.mockPro ?? false,
    disableAds: params.disableAds ?? true,
    ...params,
  });
}
