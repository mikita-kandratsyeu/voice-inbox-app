import React, { memo } from 'react';
import { View } from 'react-native';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import type { Colors } from '@/shared/config';
import { EmptyState } from '@/shared/ui';

type InboxScreenEmptyLibraryProps = {
  color: Colors;
  insetsBottom: number;
  isTablet: boolean;
  bannerMaxWidth: number;
  title: string;
  description: string;
  hint: string;
};

function InboxScreenEmptyLibraryInner({
  color,
  insetsBottom,
  isTablet,
  bannerMaxWidth,
  title,
  description,
  hint,
}: InboxScreenEmptyLibraryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color.background.secondary,
        paddingBottom: getFloatingTabBarScrollPaddingBottom(insetsBottom, isTablet),
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState title={title} description={description} hint={hint} />
      </View>
      <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} density="compact" />
    </View>
  );
}

export const InboxScreenEmptyLibrary = memo(InboxScreenEmptyLibraryInner);
