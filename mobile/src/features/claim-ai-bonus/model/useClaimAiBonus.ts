import { YANDEX_REWARDED_AD_UNIT_ID } from '@env';
import { useCallback, useEffect, useState } from 'react';
import { AdRequestConfiguration, RewardedAdLoader } from 'yandex-mobile-ads';

import { isEUUserByStorefront } from '@/features/app-storefront/lib/storefront';
import type { AiUsage } from '@/shared/lib/ai-api';
import { claimAiBonus } from '@/shared/lib/ai-api';

const DEMO_AD_UNIT_ID = 'demo-rewarded-yandex';

function getErrorText(err: unknown): string {
  if (err && typeof err === 'object' && 'description' in err) {
    const d = (err as { description?: string }).description;
    if (typeof d === 'string' && d.trim()) return d;
  }
  return err instanceof Error ? err.message : String(err);
}

function normalizeAdError(err: unknown): string {
  const raw = getErrorText(err);
  const lower = raw.toLowerCase();
  if (
    lower.includes('skadnetwork') ||
    lower.includes('skad') ||
    raw.includes('zq492l623r.skadnetwork')
  ) {
    return 'claimAdIosAd';
  }
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { description?: string };
      if (
        typeof parsed.description === 'string' &&
        parsed.description.toLowerCase().includes('skadnetwork')
      ) {
        return 'claimAdIosAd';
      }
    } catch {
      if (__DEV__) {
        console.error('normalizeAdError', raw);
      }
    }
    return 'claimAdIosAd';
  }
  if (raw.length > 180) {
    return 'claimAdFailed';
  }
  return raw;
}

function getAdUnitId(): string {
  const raw = YANDEX_REWARDED_AD_UNIT_ID ?? '';
  const id = typeof raw === 'string' && raw.trim();

  return id ? raw.trim() : DEMO_AD_UNIT_ID;
}

export function useClaimAiBonus(onSuccess?: (usage: AiUsage) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async () => {
    if (loading) {
      return;
    }

    if (await isEUUserByStorefront()) {
      return;
    }

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
          const err = result.cooldown ? 'claimCooldown' : result.error || 'claimError';
          setError(err === 'bonus_no_usage' ? 'claimBonusNoUsage' : err);
        }
        setLoading(false);
      };

      ad.onAdFailedToShow = (adError?: { description?: string }) => {
        setError(adError ? normalizeAdError(adError) : 'claimAdFailed');
        setLoading(false);
      };

      ad.onAdDismissed = () => {
        setLoading(false);
      };

      await ad.show();
    } catch (err) {
      setError(normalizeAdError(err));
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
