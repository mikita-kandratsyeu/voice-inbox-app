/** Lightweight bus so sidebar/settings AI usage cards refetch after cloud jobs. */

type AiUsageRefreshListener = () => void;

const listeners = new Set<AiUsageRefreshListener>();

export function subscribeAiUsageRefresh(listener: AiUsageRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestAiUsageRefresh(): void {
  for (const listener of listeners) {
    listener();
  }
}
