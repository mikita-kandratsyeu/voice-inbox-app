import dayjs from 'dayjs';

import { storage } from '@/shared/lib/async-storage';

const KEY_HAS_SEEN_ONBOARDING = 'onboarding.hasSeen';
const KEY_TERMS_AGREED_AT = 'onboarding.termsAgreedAt';

export const getHasSeenOnboarding = (): boolean =>
  storage.getBoolean(KEY_HAS_SEEN_ONBOARDING) ?? false;

export const setHasSeenOnboarding = (): void => {
  storage.set(KEY_HAS_SEEN_ONBOARDING, true);
};

export const getTermsAgreedAt = (): string | null => storage.getString(KEY_TERMS_AGREED_AT) ?? null;

export const setTermsAgreedAt = (): void => {
  storage.set(KEY_TERMS_AGREED_AT, dayjs().toISOString());
};
