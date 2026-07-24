import type { AiUsage } from '@/shared/lib/ai-api';

/** Pro may purchase a weekly limit reset once usage reaches this fraction of the limit. */
export const PRO_RESET_USAGE_THRESHOLD = 0.9;

export function isProResetEligible(usage: Pick<AiUsage, 'used' | 'limit' | 'remaining'>): boolean {
  if (usage.limit <= 0) {
    return false;
  }
  if (usage.remaining === 0) {
    return true;
  }
  return usage.used / usage.limit >= PRO_RESET_USAGE_THRESHOLD;
}
