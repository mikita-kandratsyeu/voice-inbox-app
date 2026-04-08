import React, { createContext, useCallback, useContext, useRef } from 'react';

type InboxFiltersResetContextValue = {
  registerReset: (reset: () => void) => () => void;
  triggerReset: () => void;
};

const InboxFiltersResetContext = createContext<InboxFiltersResetContextValue | null>(null);

export const InboxFiltersResetProvider = ({ children }: { children: React.ReactNode }) => {
  const resetRef = useRef<(() => void) | null>(null);
  const pendingResetRef = useRef(false);

  const registerReset = useCallback((reset: () => void) => {
    resetRef.current = reset;
    if (pendingResetRef.current) {
      pendingResetRef.current = false;
      reset();
    }

    return () => {
      resetRef.current = null;
    };
  }, []);

  const triggerReset = useCallback(() => {
    if (resetRef.current) {
      resetRef.current();
    } else {
      pendingResetRef.current = true;
    }
  }, []);

  const value: InboxFiltersResetContextValue = { registerReset, triggerReset };

  return (
    <InboxFiltersResetContext.Provider value={value}>{children}</InboxFiltersResetContext.Provider>
  );
};

export const useInboxFiltersReset = () => {
  const ctx = useContext(InboxFiltersResetContext);
  if (!ctx) return null;
  return ctx;
};
