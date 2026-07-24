import type { PrivateRemoteQueueConcurrency } from '../model/types';

export const PRIVATE_REMOTE_QUEUE_CONCURRENCY_OPTIONS: PrivateRemoteQueueConcurrency[] = [
  1, 2, 3, 4, 5,
];

export const DEFAULT_PRIVATE_REMOTE_QUEUE_CONCURRENCY: PrivateRemoteQueueConcurrency = 1;

export function clampPrivateRemoteQueueConcurrency(value: number): PrivateRemoteQueueConcurrency {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as PrivateRemoteQueueConcurrency;
}

export function parseStoredPrivateRemoteQueueConcurrency(
  raw: string | undefined,
): PrivateRemoteQueueConcurrency {
  if (!raw) return DEFAULT_PRIVATE_REMOTE_QUEUE_CONCURRENCY;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return DEFAULT_PRIVATE_REMOTE_QUEUE_CONCURRENCY;
  return clampPrivateRemoteQueueConcurrency(parsed);
}
