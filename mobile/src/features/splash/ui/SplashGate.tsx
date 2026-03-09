import React, { useState } from 'react';

import { SplashScreen } from './SplashScreen';

type SplashGateProps = {
  children: React.ReactNode;
};

export const SplashGate = ({ children }: SplashGateProps) => {
  const [isSplashDone, setIsSplashDone] = useState(false);

  if (!isSplashDone) {
    return <SplashScreen onFinish={() => setIsSplashDone(true)} />;
  }

  return <>{children}</>;
};
