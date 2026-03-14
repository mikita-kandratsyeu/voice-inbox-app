import React, { useState } from 'react';
import { Platform } from 'react-native';

import { ensurePushRegistered } from '@/shared/lib/push';

import { getHasSeenOnboarding } from '../lib/onboardingStorage';
import { useOnboardingStore } from '../model/store';
import { OnboardingScreen } from './OnboardingScreen';

type OnboardingGateProps = {
  children: React.ReactNode;
};

export const OnboardingGate = ({ children }: OnboardingGateProps) => {
  const [hasSeen, setHasSeen] = useState(getHasSeenOnboarding);
  const forceShow = useOnboardingStore((s) => s.forceShow);
  const setForceShow = useOnboardingStore((s) => s.setForceShow);

  const handleComplete = () => {
    setHasSeen(true);
    setForceShow(false);
    if (Platform.OS === 'ios') {
      ensurePushRegistered().catch(() => {});
    }
  };

  if (!hasSeen || forceShow) {
    return <OnboardingScreen onComplete={handleComplete} />;
  }

  return <>{children}</>;
};
