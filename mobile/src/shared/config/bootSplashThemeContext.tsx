import React, { createContext, useContext } from 'react';

const BootSplashVisibleContext = createContext(false);

type BootSplashVisibleProviderProps = {
  value: boolean;
  children: React.ReactNode;
};

export function BootSplashVisibleProvider({ value, children }: BootSplashVisibleProviderProps) {
  return (
    <BootSplashVisibleContext.Provider value={value}>{children}</BootSplashVisibleContext.Provider>
  );
}

export function useBootSplashVisible(): boolean {
  return useContext(BootSplashVisibleContext);
}
