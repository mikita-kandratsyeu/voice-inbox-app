import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { resolveNetworkConnected } from './resolveNetworkConnected';

const DELAY_MS = 100;

type NetworkStatusContextValue = {
  isConnected: boolean | null;
};

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

export const NetworkStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void NetInfo.fetch().then((state) => {
      if (cancelled) return;
      setIsConnected(resolveNetworkConnected(state));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = resolveNetworkConnected(state);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(
        () => {
          if (cancelled) return;
          setIsConnected(connected);
        },
        connected ? DELAY_MS : 0,
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isConnected }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider');
  }
  return context;
};
