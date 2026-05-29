import { useIsInsideTabletShell } from '@/app/navigation/tablet/TabletShellContext';

/** Persistent left sidebar layout (Inbox/Settings tabs), not every tablet-sized screen. */
export const useTabletShellLayout = (): boolean => useIsInsideTabletShell();
