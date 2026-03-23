import React, { useEffect, useState } from 'react';

import type { Colors } from '@/shared/config';

import { InboxBannerAd } from './InboxBannerAd';

type DeferredInboxBannerAdProps = {
  color: Colors;
  contentMaxWidth: number;
  density?: 'default' | 'compact';
  surface?: 'default' | 'onAccentRecording';
  delayMs?: number;
};

export function DeferredInboxBannerAd({ delayMs = 1200, ...props }: DeferredInboxBannerAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return <InboxBannerAd {...props} />;
}
