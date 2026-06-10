type GithubSyncSessionListener = () => void;

let syncActive = false;
const listeners = new Set<GithubSyncSessionListener>();

export function isGithubSyncSessionActive(): boolean {
  return syncActive;
}

export function setGithubSyncSessionActive(active: boolean): void {
  if (syncActive === active) {
    return;
  }
  syncActive = active;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGithubSyncSession(listener: GithubSyncSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
