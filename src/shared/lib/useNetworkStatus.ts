import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

const DELAY_MS = 100;

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      setIsConnected(Boolean(state.isConnected && state.isInternetReachable));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => setIsConnected(connected), connected ? DELAY_MS : 0);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { isConnected };
};
