import React from 'react';

import { useIsTablet } from '@/shared/lib';
import { FrostedChromeBackground } from '@/shared/ui';

import { FLOAT_TAB_BAR_HEIGHT_PHONE, FLOAT_TAB_BAR_HEIGHT_TABLET } from '../config/tabBarConfig';

export function FloatingTabBarBackground() {
  const isTablet = useIsTablet();
  const pillRadius = (isTablet ? FLOAT_TAB_BAR_HEIGHT_TABLET : FLOAT_TAB_BAR_HEIGHT_PHONE) / 2;

  return <FrostedChromeBackground borderRadius={pillRadius} />;
}
