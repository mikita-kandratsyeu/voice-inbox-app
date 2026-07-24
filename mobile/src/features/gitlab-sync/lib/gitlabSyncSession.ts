type GitlabSyncSessionListener = () => void;

let syncActive = false;
const listeners = new Set<GitlabSyncSessionListener>();

export function isGitlabSyncSessionActive(): boolean {
  return syncActive;
}

export function setGitlabSyncSessionActive(active: boolean): void {
  if (syncActive === active) {
    return;
  }
  syncActive = active;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGitlabSyncSession(listener: GitlabSyncSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
