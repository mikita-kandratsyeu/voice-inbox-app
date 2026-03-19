import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { BannerView } from 'yandex-mobile-ads';

import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import type { Colors } from '@/shared/config';

import { getBannerAdUnitId } from '../lib/getBannerAdUnitId';
import { useInboxBannerSize } from '../model/useInboxBannerSize';

type InboxBannerAdProps = {
  color: Colors;
  /** Совпадает с maxWidth контента (например 720 на планшете). */
  contentMaxWidth: number;
};

export function InboxBannerAd({ color, contentMaxWidth }: InboxBannerAdProps) {
  const { t } = useTranslation();
  const bannerSize = useInboxBannerSize(contentMaxWidth);
  const [loadFailed, setLoadFailed] = useState(false);

  const onAdFailedToLoad = useCallback(() => {
    setLoadFailed(true);
  }, []);

  if (!getHasSeenOnboarding() || loadFailed || !bannerSize) {
    return null;
  }

  return (
    <View
      className="border-t px-3 pt-3 pb-1"
      style={{
        borderTopColor: color.border.default,
        backgroundColor: color.background.secondary,
      }}
    >
      <Text
        className="mb-2 text-center text-[10px] uppercase tracking-wide"
        style={{ color: color.text.muted }}
      >
        {t('inbox.adLabel')}
      </Text>
      <View className="items-center overflow-hidden rounded-xl" style={{ alignSelf: 'center' }}>
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
