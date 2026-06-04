import { createContext, useContext } from 'react';

export type TabletShellContextValue = {
  importAudioFile: () => Promise<void>;
};

const TabletShellContext = createContext<TabletShellContextValue | null>(null);

export const TabletShellProvider = TabletShellContext.Provider;

/** True only inside `TabletShellLayout` (sidebar + main column), not on full-screen stack routes. */
export function useIsInsideTabletShell(): boolean {
  return useContext(TabletShellContext) != null;
}

export function useTabletShellImportAudio(): () => Promise<void> {
  const ctx = useContext(TabletShellContext);
  if (!ctx) {
    throw new Error('useTabletShellImportAudio must be used within TabletShellProvider');
  }
  return ctx.importAudioFile;
}
