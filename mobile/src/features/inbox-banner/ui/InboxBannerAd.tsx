import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeSyntheticEvent } from 'react-native';
import { Text, useWindowDimensions, View } from 'react-native';
import { BannerView } from 'yandex-mobile-ads';

import { useAdsAllowed } from '@/features/app-storefront';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import type { Colors } from '@/shared/config';

import { getBannerAdUnitId } from '../lib/getBannerAdUnitId';
import { useInboxBannerSize } from '../model/useInboxBannerSize';

const CARD_BANNER_WIDTH_INSET = 56;

type InboxBannerAdProps = {
  color: Colors;
  contentMaxWidth: number;
  density?: 'default' | 'compact';
  surface?: 'default' | 'onAccentRecording';
  variant?: 'strip' | 'card';
};

export function InboxBannerAd({
  color,
  contentMaxWidth,
  density = 'default',
  surface = 'default',
  variant = 'strip',
}: InboxBannerAdProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const { adsAllowed } = useAdsAllowed();
  const sizeBasis = useMemo(() => {
    if (variant === 'card') {
      const listWidth = Math.min(windowWidth, contentMaxWidth);
      return Math.max(320, Math.floor(listWidth - CARD_BANNER_WIDTH_INSET));
    }
    return contentMaxWidth;
  }, [variant, windowWidth, contentMaxWidth]);
  const bannerSize = useInboxBannerSize(sizeBasis);
  const [, setRetryAttempt] = useState(0);
  const [nextTryAt, setNextTryAt] = useState<number | null>(null);
  const [permanentlyDisabled, setPermanentlyDisabled] = useState(false);

  const isRetrySuppressed = nextTryAt != null && nextTryAt > Date.now();

  const handleBannerFailedToLoad = useCallback(
    (_event: NativeSyntheticEvent<{ description: string; code?: string; adUnitId?: string }>) => {
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
    },
    [],
  );

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

  const labelClassName =
    variant === 'card'
      ? 'mb-2 text-center text-[10px] uppercase tracking-wide'
      : compact
        ? 'mb-1.5 text-center text-[9px] uppercase tracking-wide'
        : 'mb-2 text-center text-[10px] uppercase tracking-wide';

  const labelColor =
    variant === 'card' ? color.text.muted : onAccent ? 'rgba(255,255,255,0.52)' : color.text.muted;

  const cardChrome =
    variant === 'card'
      ? {
          shadowColor: color.shadow.color,
          shadowOffset: { width: 0, height: 1 } as const,
          shadowOpacity: color.shadow.opacity,
          shadowRadius: 4,
          elevation: 2,
          backgroundColor: color.background.card,
          borderRadius: 16,
        }
      : null;

  const outer = (
    <>
      <Text className={labelClassName} style={{ color: labelColor }}>
        {t('inbox.adLabel')}
      </Text>
      <View
        className="items-center overflow-hidden rounded-xl"
        style={{ alignSelf: 'center', opacity: compact && variant === 'strip' ? 0.97 : 1 }}
      >
        <BannerView
          size={bannerSize}
          adRequest={{ adUnitId: getBannerAdUnitId() }}
          onAdFailedToLoad={handleBannerFailedToLoad}
          style={{
            width: bannerSize.width,
            height: bannerSize.height,
          }}
        />
      </View>
    </>
  );

  if (variant === 'card' && cardChrome) {
    return (
      <View
        className="mb-4"
        style={{ marginHorizontal: 16 }}
        accessibilityRole="none"
        accessibilityLabel={t('inbox.adLabel')}
      >
        <View className="px-3 py-3" style={cardChrome}>
          {outer}
        </View>
      </View>
    );
  }

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
      {outer}
    </View>
  );
}
