import React, { useCallback, useState } from 'react';
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
  const { adsAllowed, resolved } = useAdsAllowed();
  const bannerSize = useInboxBannerSize(contentMaxWidth);
  const [loadFailed, setLoadFailed] = useState(false);

  const onAdFailedToLoad = useCallback(() => {
    setLoadFailed(true);
  }, []);

  if (!resolved || !adsAllowed || !getHasSeenOnboarding() || loadFailed || !bannerSize) {
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
            ? 'border-t px-3 pt-2 pb-1 mt-2'
            : 'border-t px-3 pt-3 pb-1 mt-3'
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
