import { YANDEX_REWARDED_AD_UNIT_ID } from '@env';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AdRequestConfiguration, RewardedAdLoader } from 'yandex-mobile-ads';

import { isEUUserByStorefront } from '@/features/app-storefront/lib/storefront';
import type { AiUsage } from '@/shared/lib/ai-api';
import { claimAiBonus } from '@/shared/lib/ai-api';
import { storage } from '@/shared/lib/async-storage';

const DEMO_AD_UNIT_ID = 'demo-rewarded-yandex';

const AI_BONUS_COOLDOWN_UNTIL_KEY = 'ai_bonus_cooldown_until_ms';

function readPersistedCooldownUntil(): number | null {
  try {
    const n = storage.getNumber(AI_BONUS_COOLDOWN_UNTIL_KEY);
    if (n == null || n <= 0) return null;
    if (n <= Date.now()) {
      storage.remove(AI_BONUS_COOLDOWN_UNTIL_KEY);
      return null;
    }
    return n;
  } catch {
    return null;
  }
}

function persistCooldownUntil(ms: number): void {
  storage.set(AI_BONUS_COOLDOWN_UNTIL_KEY, ms);
}

function clearPersistedCooldown(): void {
  storage.remove(AI_BONUS_COOLDOWN_UNTIL_KEY);
}

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
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(readPersistedCooldownUntil);
  const [error, setError] = useState<string | null>(null);

  const displayError =
    cooldownUntil != null && cooldownUntil > Date.now() ? 'claimCooldown' : error;

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
          clearPersistedCooldown();
          setCooldownUntil(null);
          onSuccess?.(result.usage);
        } else if (result.cooldown) {
          const sec = result.retryAfterSeconds ?? 900;
          const until = Date.now() + sec * 1000;
          persistCooldownUntil(until);
          setCooldownUntil(until);
          setError(null);
        } else {
          const err = result.error || 'claimError';
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
    if (cooldownUntil == null || cooldownUntil <= Date.now()) return;
    const delay = cooldownUntil - Date.now();
    const id = setTimeout(() => {
      setCooldownUntil(null);
      clearPersistedCooldown();
    }, delay);
    return () => clearTimeout(id);
  }, [cooldownUntil]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setCooldownUntil(readPersistedCooldownUntil());
      }
    });
    return () => sub.remove();
  }, []);

  return { claim, loading, error: displayError, clearError };
}
