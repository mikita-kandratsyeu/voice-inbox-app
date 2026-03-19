import { YANDEX_REWARDED_AD_UNIT_ID } from '@env';
import { useCallback, useEffect, useState } from 'react';
import { AdRequestConfiguration, RewardedAdLoader } from 'yandex-mobile-ads';

import type { AiUsage } from '@/shared/lib/ai-api';
import { claimAiBonus } from '@/shared/lib/ai-api';

const DEMO_AD_UNIT_ID = 'demo-rewarded-yandex';

function getAdUnitId(): string {
  const raw = YANDEX_REWARDED_AD_UNIT_ID ?? '';
  const id = typeof raw === 'string' && raw.trim();

  return id ? raw.trim() : DEMO_AD_UNIT_ID;
}

export function useClaimAiBonus(onSuccess?: (usage: AiUsage) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const loader = await RewardedAdLoader.create();
      const config = new AdRequestConfiguration({
        adUnitId: getAdUnitId(),
      });
      const ad = await loader.loadAd(config);

      ad.onRewarded = async () => {
        const result = await claimAiBonus();
        if (result.ok) {
          onSuccess?.(result.usage);
        } else {
          setError(result.cooldown ? 'claimCooldown' : result.error || 'claimError');
        }
        setLoading(false);
      };

      ad.onAdFailedToShow = () => {
        setError('claimAdFailed');
        setLoading(false);
      };

      ad.onAdDismissed = () => {
        setLoading(false);
      };

      await ad.show();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load ad';
      setError(message);
      setLoading(false);
    }
  }, [loading, onSuccess]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (error !== 'claimCooldown') return;
    const t = setTimeout(clearError, 15 * 60 * 1000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  return { claim, loading, error, clearError };
}
