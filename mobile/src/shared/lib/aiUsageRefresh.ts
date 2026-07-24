/** Lightweight bus so sidebar/settings AI usage cards refetch after cloud jobs. */

type AiUsageRefreshListener = () => void;

const REFRESH_DEBOUNCE_MS = 350;
const listeners = new Set<AiUsageRefreshListener>();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribeAiUsageRefresh(listener: AiUsageRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestAiUsageRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    for (const listener of listeners) {
      listener();
    }
  }, REFRESH_DEBOUNCE_MS);
}

export function flushAiUsageRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  for (const listener of listeners) {
    listener();
  }
}
