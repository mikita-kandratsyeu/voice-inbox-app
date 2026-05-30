import { WHISPER_ABORT_SETTLE_MS, WHISPER_NATIVE_SETTLE_MS } from '../config/constants';

/** Tracks in-flight whisper.rn native work (whisper_full / mel workers / init). */
let nativeWorkDepth = 0;
let idleWaiters: Array<() => void> = [];
let onNativeIdle: (() => void) | null = null;
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let operationChain: Promise<void> = Promise.resolve();

const notifyNativeIdle = (): void => {
  flushIdleWaiters();
  onNativeIdle?.();
};

const flushIdleWaiters = (): void => {
  if (nativeWorkDepth > 0 || idleWaiters.length === 0) return;
  const waiters = idleWaiters;
  idleWaiters = [];
  for (const resolve of waiters) {
    resolve();
  }
};

const scheduleNativeIdleNotification = (): void => {
  if (settleTimer) {
    clearTimeout(settleTimer);
  }
  settleTimer = setTimeout(() => {
    settleTimer = null;
    if (nativeWorkDepth === 0) {
      notifyNativeIdle();
    }
  }, WHISPER_NATIVE_SETTLE_MS);
};

export function setWhisperNativeIdleListener(listener: (() => void) | null): void {
  onNativeIdle = listener;
}

export function beginWhisperNativeWork(): void {
  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  nativeWorkDepth += 1;
}

export function endWhisperNativeWork(): void {
  nativeWorkDepth = Math.max(0, nativeWorkDepth - 1);
  if (nativeWorkDepth > 0) {
    return;
  }
  scheduleNativeIdleNotification();
}

export function isWhisperNativeWorkActive(): boolean {
  return nativeWorkDepth > 0;
}

export function waitForWhisperNativeIdle(): Promise<void> {
  if (nativeWorkDepth === 0 && !settleTimer) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    idleWaiters.push(resolve);
  });
}

/** Used after background abort — native Metal may outlive JS depth briefly. */
export async function waitForWhisperNativeIdleAfterAbort(): Promise<void> {
  await waitForWhisperNativeIdle();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, WHISPER_ABORT_SETTLE_MS);
  });
}

/** Serializes init/release/transcribe so RNWhisper never races on Metal. */
export function enqueueWhisperOperation<T>(
  operation: () => Promise<T>,
  label?: string,
): Promise<T> {
  const run = operationChain.then(operation, operation);
  operationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
