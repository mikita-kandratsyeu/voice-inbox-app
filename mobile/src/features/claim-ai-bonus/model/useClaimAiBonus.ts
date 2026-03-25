import { useCallback, useEffect, useRef, useState } from 'react';
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

type RewardedAdLoaderInstance = Awaited<ReturnType<typeof RewardedAdLoader.create>>;
type RewardedAdInstance = Awaited<ReturnType<RewardedAdLoaderInstance['loadAd']>>;

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

  const isProActiveRef = useRef(isProActive);
  useEffect(() => {
    isProActiveRef.current = isProActive;
  }, [isProActive]);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const preloadedAdRef = useRef<RewardedAdInstance | null>(null);
  const preloadPromiseRef = useRef<Promise<RewardedAdInstance | null> | null>(null);

  const setupAdHandlers = useCallback(
    (ad: RewardedAdInstance) => {
      ad.onRewarded = async () => {
        const result = await claimAiBonus();
        if (result.ok) {
          const sec = result.cooldownSeconds;
          const until = Date.now() + sec * 1000;
          persistCooldownUntil(until);
          setCooldownUntil(until);
          onSuccessRef.current?.(result.usage);
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
    },
    [setCooldownUntil, setError, setLoading],
  );

  const preloadAd = useCallback(async (): Promise<RewardedAdInstance | null> => {
    if (isProActiveRef.current) return null;
    if (preloadedAdRef.current) return preloadedAdRef.current;
    if (preloadPromiseRef.current) return preloadPromiseRef.current;

    const promise = (async (): Promise<RewardedAdInstance | null> => {
      try {
        const loader = await RewardedAdLoader.create();
        const config = new AdRequestConfiguration({
          adUnitId: getAdUnitId(),
        });
        const ad = await loader.loadAd(config);

        if (isProActiveRef.current) return null;

        setupAdHandlers(ad);
        preloadedAdRef.current = ad;
        return ad;
      } catch (err) {
        if (__DEV__) {
          logRewardedAdDebug('loadAd', err);
        }
        return null;
      } finally {
        preloadPromiseRef.current = null;
      }
    })();

    preloadPromiseRef.current = promise;
    return promise;
  }, [setupAdHandlers]);

  useEffect(() => {
    if (isProActive) {
      preloadedAdRef.current = null;
      preloadPromiseRef.current = null;
    }
  }, [isProActive]);

  const claim = useCallback(async () => {
    if (loading) {
      return;
    }

    if (isProActive) {
      return;
    }

    if (cooldownUntil != null && cooldownUntil > Date.now()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let ad = preloadedAdRef.current;
      if (!ad && preloadPromiseRef.current) {
        ad = await preloadPromiseRef.current;
      }

      if (ad) {
        preloadedAdRef.current = null;
        await ad.show();
        return;
      }

      const loader = await RewardedAdLoader.create();
      const config = new AdRequestConfiguration({
        adUnitId: getAdUnitId(),
      });
      ad = await loader.loadAd(config);
      setupAdHandlers(ad);
      await ad.show();
    } catch (err) {
      logRewardedAdDebug('loadAd', err);
      setError(normalizeAdError(err));
      setLoading(false);
    }
  }, [loading, isProActive, cooldownUntil, setupAdHandlers]);

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
    if (isProActive) return;
    if (cooldownUntil != null) return;
    if (loading) return;
    if (preloadedAdRef.current) return;
    if (preloadPromiseRef.current) return;

    if (error != null && error !== 'claimAdFailed') return;

    const id = setTimeout(() => {
      void preloadAd();
    }, 800);
    return () => clearTimeout(id);
  }, [cooldownUntil, error, isProActive, loading, preloadAd]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setCooldownUntil(readPersistedCooldownUntil());
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      preloadedAdRef.current = null;
      preloadPromiseRef.current = null;
    };
  }, []);

  return { claim, loading, error: displayError, clearError };
}
