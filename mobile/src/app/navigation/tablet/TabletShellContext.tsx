import { createContext, useContext } from 'react';

const TabletShellContext = createContext(false);

export const TabletShellProvider = TabletShellContext.Provider;

/** True only inside `TabletShellLayout` (sidebar + main column), not on full-screen stack routes. */
export function useIsInsideTabletShell(): boolean {
  return useContext(TabletShellContext);
}
