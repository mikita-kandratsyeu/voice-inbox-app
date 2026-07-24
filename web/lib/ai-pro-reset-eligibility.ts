import { PRO_RESET_USAGE_THRESHOLD } from '@/config/constants';
import type { AiUsage } from '@/lib/ai-rate-limit';

export function isProResetEligible(usage: Pick<AiUsage, 'used' | 'limit' | 'remaining'>): boolean {
  if (usage.limit <= 0) {
    return false;
  }
  if (usage.remaining === 0) {
    return true;
  }
  return usage.used / usage.limit >= PRO_RESET_USAGE_THRESHOLD;
}
