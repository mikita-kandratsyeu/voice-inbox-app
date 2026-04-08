export function scheduleAfterUiSettles(fn: () => void): void {
  const idle = globalThis.requestIdleCallback;

  if (typeof idle === 'function') {
    idle(() => fn(), { timeout: 64 });
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fn();
    });
  });
}
