import { useIsTablet } from './useIsTablet';

/** Persistent left sidebar instead of the floating bottom tab bar. */
export const useTabletShellLayout = (): boolean => useIsTablet();
