/** Tracks in-flight whisper.rn native work (whisper_full / mel workers). */
let nativeWorkDepth = 0;
let idleWaiters: Array<() => void> = [];
let onNativeIdle: (() => void) | null = null;

const flushIdleWaiters = (): void => {
  if (nativeWorkDepth > 0 || idleWaiters.length === 0) return;
  const waiters = idleWaiters;
  idleWaiters = [];
  for (const resolve of waiters) {
    resolve();
  }
};

export function setWhisperNativeIdleListener(listener: (() => void) | null): void {
  onNativeIdle = listener;
}

export function beginWhisperNativeWork(): void {
  nativeWorkDepth += 1;
}

export function endWhisperNativeWork(): void {
  nativeWorkDepth = Math.max(0, nativeWorkDepth - 1);
  flushIdleWaiters();
  if (nativeWorkDepth === 0) {
    onNativeIdle?.();
  }
}

export function isWhisperNativeWorkActive(): boolean {
  return nativeWorkDepth > 0;
}

export function waitForWhisperNativeIdle(): Promise<void> {
  if (nativeWorkDepth === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    idleWaiters.push(resolve);
  });
}
