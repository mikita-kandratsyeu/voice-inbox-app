import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AdRequestConfiguration, RewardedAdLoader } from 'yandex-mobile-ads';

import { useProEntitlement } from '@/features/pro-license';
import { getYandexRewardedAdUnitId } from '@/shared/config/runtimeConfig';
import type { AiUsage } from '@/shared/lib/ai-api';
import { claimAiBonus } from '@/shared/lib/ai-api';
import { storage } from '@/shared/lib/async-storage';
import { isRecord, isString } from '@/shared/lib/type-guards';

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
  if (isRecord(err) && 'description' in err) {
    const d = err.description;
    if (isString(d) && d.trim()) return d;
  }

  return err instanceof Error ? err.message : String(err);
}

function parseYandexJsonError(raw: string): { description: string } | null {
  const t = raw.trim();

  if (!t.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(t) as { description?: string };
    return isString(parsed.description) && parsed.description.trim()
      ? { description: parsed.description }
      : null;
  } catch {
    return null;
  }
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

  const fromJson = parseYandexJsonError(raw);
  const textForHeuristics = fromJson?.description ?? raw;
  const heuristicsLower = textForHeuristics.toLowerCase();

  if (heuristicsLower.includes('skadnetwork') || heuristicsLower.includes('skad')) {
    return 'claimAdIosAd';
  }
  if (
    heuristicsLower.includes('no ads available') ||
    heuristicsLower.includes('нет доступной рекламы')
  ) {
    return 'claimAdNoInventory';
  }

  if (raw.trim().startsWith('{')) {
    if (fromJson == null && __DEV__) {
      console.error('normalizeAdError: invalid JSON', raw);
    }
    return 'claimAdFailed';
  }
  if (raw.length > 180) {
    return 'claimAdFailed';
  }
  return raw;
}

function getAdUnitId(): string {
  const raw = getYandexRewardedAdUnitId() ?? '';
  return isString(raw) && raw.trim() ? raw.trim() : DEMO_AD_UNIT_ID;
}

function serializeAdErrorForLog(err: unknown): unknown {
  if (err == null) return err;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  if (isRecord(err)) {
    return err;
  }
  return String(err);
}

function logRewardedAdDebug(phase: 'loadAd' | 'showAd', err: unknown): void {
  if (!__DEV__) return;
  console.warn('[rewardedAd]', phase, {
    adUnitId: getAdUnitId(),
    description: getErrorText(err),
    raw: serializeAdErrorForLog(err),
  });
}

export function useClaimAiBonus(onSuccess?: (usage: AiUsage) => void) {
  const { isProActive } = useProEntitlement();
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(readPersistedCooldownUntil);
  const [error, setError] = useState<string | null>(null);

  const displayError =
    cooldownUntil != null && cooldownUntil > Date.now() ? 'claimCooldown' : error;

  const claim = useCallback(async () => {
    if (loading) {
      return;
    }

    if (isProActive) {
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
          const sec = result.cooldownSeconds;
          const until = Date.now() + sec * 1000;
          persistCooldownUntil(until);
          setCooldownUntil(until);
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
        if (adError != null) {
          logRewardedAdDebug('showAd', adError);
        } else if (__DEV__) {
          console.warn('[rewardedAd]', 'showAd', {
            adUnitId: getAdUnitId(),
            note: 'onAdFailedToShow without error payload',
          });
        }
        setError(adError ? normalizeAdError(adError) : 'claimAdFailed');
        setLoading(false);
      };

      ad.onAdDismissed = () => {
        setLoading(false);
      };

      await ad.show();
    } catch (err) {
      logRewardedAdDebug('loadAd', err);
      setError(normalizeAdError(err));
      setLoading(false);
    }
  }, [loading, onSuccess, isProActive]);

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
