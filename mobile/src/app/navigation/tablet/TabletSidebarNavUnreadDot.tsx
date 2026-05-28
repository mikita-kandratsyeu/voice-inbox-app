import React from 'react';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';

type Props = {
  color: Colors;
};

export function TabletSidebarNavUnreadDot({ color }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color.status.error.text,
      }}
    />
  );
}
