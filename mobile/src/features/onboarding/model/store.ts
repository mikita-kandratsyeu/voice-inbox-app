import { create } from 'zustand';

import { getHasSeenOnboarding, setHasSeenOnboarding } from '../lib/onboardingStorage';

type OnboardingStore = {
  hasSeenOnboarding: boolean;
  forceShow: boolean;
  setForceShow: (value: boolean) => void;
  markOnboardingComplete: () => void;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  hasSeenOnboarding: getHasSeenOnboarding(),
  forceShow: false,
  setForceShow: (value) => set({ forceShow: value }),
  markOnboardingComplete: () => {
    setHasSeenOnboarding();
    set({ hasSeenOnboarding: true });
  },
}));
