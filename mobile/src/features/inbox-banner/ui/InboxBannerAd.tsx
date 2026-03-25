import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { BannerView } from 'yandex-mobile-ads';

import { useAdsAllowed } from '@/features/app-storefront';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import type { Colors } from '@/shared/config';

import { getBannerAdUnitId } from '../lib/getBannerAdUnitId';
import { useInboxBannerSize } from '../model/useInboxBannerSize';

type InboxBannerAdProps = {
  color: Colors;
  contentMaxWidth: number;
  density?: 'default' | 'compact';
  surface?: 'default' | 'onAccentRecording';
};

export function InboxBannerAd({
  color,
  contentMaxWidth,
  density = 'default',
  surface = 'default',
}: InboxBannerAdProps) {
  const { t } = useTranslation();
  const { adsAllowed } = useAdsAllowed();
  const bannerSize = useInboxBannerSize(contentMaxWidth);
  const [, setRetryAttempt] = useState(0);
  const [nextTryAt, setNextTryAt] = useState<number | null>(null);
  const [permanentlyDisabled, setPermanentlyDisabled] = useState(false);

  const isRetrySuppressed = nextTryAt != null && nextTryAt > Date.now();

  const onAdFailedToLoad = useCallback(() => {
    setRetryAttempt((attempt) => {
      const nextAttempt = attempt + 1;

      if (nextAttempt > 6) {
        setPermanentlyDisabled(true);
        setNextTryAt(null);

        return attempt;
      }

      const delayMs = Math.min(15_000, 1_000 * 2 ** nextAttempt);
      setNextTryAt(Date.now() + delayMs);
      return nextAttempt;
    });
  }, []);

  useEffect(() => {
    if (nextTryAt == null) return;

    const delay = nextTryAt - Date.now();
    if (delay <= 0) {
      setNextTryAt(null);
      return;
    }

    const id = setTimeout(() => setNextTryAt(null), delay);
    return () => clearTimeout(id);
  }, [nextTryAt]);

  useEffect(() => {
    setRetryAttempt(0);
    setNextTryAt(null);
    setPermanentlyDisabled(false);
  }, [adsAllowed, bannerSize]);

  if (
    !adsAllowed ||
    !getHasSeenOnboarding() ||
    permanentlyDisabled ||
    isRetrySuppressed ||
    !bannerSize
  ) {
    return null;
  }

  const compact = density === 'compact';
  const onAccent = surface === 'onAccentRecording';

  return (
    <View
      className={
        onAccent
          ? compact
            ? 'px-3 pt-2 pb-1'
            : 'px-3 pt-3 pb-1'
          : compact
            ? 'border-t px-3 pt-2 pb-1 mt-1'
            : 'border-t px-3 pt-3 pb-1 mt-1'
      }
      style={{
        borderTopColor: onAccent ? 'transparent' : color.border.default,
        backgroundColor: onAccent ? 'transparent' : color.background.secondary,
        opacity: onAccent ? 1 : compact ? 0.94 : 1,
      }}
    >
      <Text
        className={
          compact
            ? 'mb-1.5 text-center text-[9px] uppercase tracking-wide'
            : 'mb-2 text-center text-[10px] uppercase tracking-wide'
        }
        style={{ color: onAccent ? 'rgba(255,255,255,0.52)' : color.text.muted }}
      >
        {t('inbox.adLabel')}
      </Text>
      <View
        className="items-center overflow-hidden rounded-xl"
        style={{ alignSelf: 'center', opacity: compact ? 0.97 : 1 }}
      >
        <BannerView
          size={bannerSize}
          adUnitId={getBannerAdUnitId()}
          onAdFailedToLoad={onAdFailedToLoad}
          style={{
            width: bannerSize.width,
            height: bannerSize.height,
          }}
        />
      </View>
    </View>
  );
}
