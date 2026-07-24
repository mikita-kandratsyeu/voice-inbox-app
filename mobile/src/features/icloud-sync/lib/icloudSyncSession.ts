let sessionActive = false;
const listeners = new Set<(active: boolean) => void>();

export function isIcloudSyncSessionActive(): boolean {
  return sessionActive;
}

export function subscribeIcloudSyncSession(listener: (active: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setIcloudSyncSessionActive(active: boolean): void {
  sessionActive = active;
  for (const listener of listeners) {
    listener(active);
  }
}

export function resetIcloudSyncSessionForTests(): void {
  sessionActive = false;
}
