type AdPresentationListener = () => void;

let activeCount = 0;
const listeners = new Set<AdPresentationListener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getAdPresentationActiveSnapshot(): boolean {
  return activeCount > 0;
}

export function subscribeAdPresentationActive(listener: AdPresentationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setAdPresentationActive(active: boolean): void {
  const next = active ? activeCount + 1 : Math.max(0, activeCount - 1);
  if (next === activeCount) {
    return;
  }
  activeCount = next;
  notifyListeners();
}

/** Test-only reset. */
export function resetAdPresentationLockForTests(): void {
  activeCount = 0;
  listeners.clear();
}
