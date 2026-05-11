import { MESSAGE_TTL_MIN_SECONDS, MESSAGE_TTL_SECONDS } from '@/config/constants';

/** Clamp optional client-requested KV TTL for AI message keys to [MESSAGE_TTL_MIN_SECONDS, MESSAGE_TTL_SECONDS]. */
export function clampMessageTtlSeconds(raw: unknown): number {
  const max = MESSAGE_TTL_SECONDS;
  const min = MESSAGE_TTL_MIN_SECONDS;

  let n: number | null = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    n = Math.floor(raw);
  } else if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) n = parsed;
  }

  if (n == null) return max;
  return Math.min(max, Math.max(min, n));
}
