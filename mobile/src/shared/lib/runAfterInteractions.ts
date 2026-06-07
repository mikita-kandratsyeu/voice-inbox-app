// Minimal replacement for InteractionManager.runAfterInteractions
// Uses requestIdleCallback when available, falls back to setTimeout.
type CancelHandle = {
  cancel: () => void;
};

export function runAfterInteractions(cb: () => void): CancelHandle {
  const g: any = global as any;
  if (typeof g.requestIdleCallback === 'function') {
    const id = g.requestIdleCallback(cb as any);
    return { cancel: () => g.cancelIdleCallback?.(id) };
  }

  const t = setTimeout(cb, 0) as unknown as number;
  return { cancel: () => clearTimeout(t) };
}

export default runAfterInteractions;
