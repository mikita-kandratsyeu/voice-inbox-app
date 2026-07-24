import { type RefObject, useCallback, useEffect, useRef } from 'react';

/** Tracks whether the owning component is still mounted. */
export function useMountedRef(): RefObject<boolean> {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}

/**
 * Wraps a callback so scheduled work (e.g. via scheduleOnRN) is skipped after unmount.
 * Prevents JSI use-after-free when timers or gesture bridges fire late.
 */
export function useSafeCallback<T extends (...args: never[]) => unknown>(
  mountedRef: RefObject<boolean>,
  callback: T,
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => {
      if (!mountedRef.current) {
        return;
      }
      return callbackRef.current(...args);
    }) as T,
    [mountedRef],
  );
}
