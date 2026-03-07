import { storage } from '@/shared/lib/async-storage';

const KEY_HAS_SEEN_ONBOARDING = 'onboarding.hasSeen';

export const getHasSeenOnboarding = (): boolean =>
  storage.getBoolean(KEY_HAS_SEEN_ONBOARDING) ?? false;

export const setHasSeenOnboarding = (): void => {
  storage.set(KEY_HAS_SEEN_ONBOARDING, true);
};
