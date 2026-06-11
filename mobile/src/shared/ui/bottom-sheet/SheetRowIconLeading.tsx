import React from 'react';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

type SheetRowIconLeadingProps = {
  icon: React.ReactNode;
  color: Colors;
  accentHex?: string;
};

export function SheetRowIconLeading({ icon, color, accentHex }: SheetRowIconLeadingProps) {
  const stripeColor = accentHex ?? color.border.default;

  return (
    <>
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: stripeColor,
          borderRadius: 2,
          flexShrink: 0,
          width: 3,
        }}
      />
      <View
        style={{
          alignItems: 'center',
          backgroundColor: accentHex ? withAlphaHex(accentHex, 0.1) : color.background.tertiary,
          borderRadius: 10,
          flexShrink: 0,
          height: 36,
          justifyContent: 'center',
          width: 36,
        }}
      >
        {icon}
      </View>
    </>
  );
}
