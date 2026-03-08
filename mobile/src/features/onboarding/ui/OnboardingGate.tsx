import React, { useState } from 'react';

import { getHasSeenOnboarding } from '../lib/onboardingStorage';
import { OnboardingScreen } from './OnboardingScreen';

type OnboardingGateProps = {
  children: React.ReactNode;
};

export const OnboardingGate = ({ children }: OnboardingGateProps) => {
  const [hasSeen, setHasSeen] = useState(getHasSeenOnboarding);

  if (!hasSeen) {
    return <OnboardingScreen onComplete={() => setHasSeen(true)} />;
  }

  return <>{children}</>;
};
