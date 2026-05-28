import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { Colors } from '@/shared/config';

type Props = {
  color: Colors;
  isActive: boolean;
};

export function TabletSidebarNavProcessingIndicator({ color, isActive }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? color.status.processing.bg : color.background.tertiary,
      }}
    >
      <ActivityIndicator
        size="small"
        color={isActive ? color.status.processing.text : color.text.secondary}
        style={{ transform: [{ scale: 0.65 }] }}
      />
    </View>
  );
}
