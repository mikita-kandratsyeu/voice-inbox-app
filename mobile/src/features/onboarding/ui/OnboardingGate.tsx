import React from 'react';

import { IS_IOS } from '@/shared/lib';
import { ensurePushRegistered } from '@/shared/lib/push';

import { useOnboardingStore } from '../model/store';
import { OnboardingScreen } from './OnboardingScreen';

type OnboardingGateProps = {
  children: React.ReactNode;
};

export const OnboardingGate = ({ children }: OnboardingGateProps) => {
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);
  const forceShow = useOnboardingStore((s) => s.forceShow);
  const setForceShow = useOnboardingStore((s) => s.setForceShow);
  const markOnboardingComplete = useOnboardingStore((s) => s.markOnboardingComplete);

  const handleComplete = () => {
    markOnboardingComplete();
    setForceShow(false);
    if (IS_IOS) {
      setTimeout(() => {
        ensurePushRegistered().catch(() => {});
      }, 400);
    }
  };

  if (!hasSeenOnboarding || forceShow) {
    return <OnboardingScreen onComplete={handleComplete} />;
  }

  return <>{children}</>;
};
