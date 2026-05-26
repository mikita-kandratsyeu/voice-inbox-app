import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';

import { openPlanPaywallFromController } from './planPaywallController';

/** Opens the global plan paywall overlay (no navigation to Settings). */
export function openPlanPaywall(): void {
  if (!getHasSeenOnboarding()) {
    return;
  }

  openPlanPaywallFromController();
}
