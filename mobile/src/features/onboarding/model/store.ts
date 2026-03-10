import { create } from 'zustand';

type OnboardingStore = {
  forceShow: boolean;
  setForceShow: (value: boolean) => void;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  forceShow: false,
  setForceShow: (value) => set({ forceShow: value }),
}));
