/** KV TTL for cloud AI job payloads (`msg:*` on the API). Keep min/max in sync with `web/config/constants.ts`. */
export const CLOUD_AI_KV_TTL_MIN_SECONDS = 300;
export const CLOUD_AI_KV_TTL_MAX_SECONDS = 3600;
export const CLOUD_AI_KV_TTL_DEFAULT_SECONDS = 3600;

/** Presets shown in Settings (Smart mode). */
export const CLOUD_AI_KV_TTL_CHOICES = [300, 600, 900, 1800, 3600] as const;
export type CloudAiKvTtlSeconds = (typeof CLOUD_AI_KV_TTL_CHOICES)[number];

export function clampCloudAiKvTtlSeconds(raw: number): number {
  if (!Number.isFinite(raw)) return CLOUD_AI_KV_TTL_DEFAULT_SECONDS;
  const n = Math.floor(raw);
  return Math.min(CLOUD_AI_KV_TTL_MAX_SECONDS, Math.max(CLOUD_AI_KV_TTL_MIN_SECONDS, n));
}

/** Map any seconds in range to the closest preset (for stored values / UI sync). */
export function snapCloudAiKvTtlToChoice(seconds: number): CloudAiKvTtlSeconds {
  const clamped = clampCloudAiKvTtlSeconds(seconds);
  let best: CloudAiKvTtlSeconds = CLOUD_AI_KV_TTL_CHOICES[0];
  let bestDist = Infinity;
  for (const c of CLOUD_AI_KV_TTL_CHOICES) {
    const d = Math.abs(c - clamped);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}
