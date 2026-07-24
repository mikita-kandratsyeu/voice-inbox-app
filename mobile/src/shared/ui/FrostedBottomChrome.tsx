import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

import { FrostedChromeBackground } from './FrostedChromeBackground';

type FrostedBottomChromeProps = {
  color: Colors;
  insetsBottom: number;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  showShadow?: boolean;
};

export const FrostedBottomChrome = ({
  color,
  insetsBottom,
  contentStyle,
  children,
  showShadow = true,
}: FrostedBottomChromeProps) => {
  return (
    <View
      style={{
        backgroundColor: 'transparent',
        ...(showShadow
          ? {
              shadowColor: color.shadow.color,
              shadowOffset: { width: 0, height: -FLOAT_TAB_IOS_SHADOW_OFFSET_Y },
              shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
              shadowRadius: FLOAT_TAB_IOS_SHADOW_RADIUS,
              elevation: 8,
            }
          : null),
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: -insetsBottom,
          overflow: 'hidden',
        }}
      >
        <FrostedChromeBackground />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: withAlphaHex(color.border.default, 0.45),
        }}
      />
      <View style={[{ backgroundColor: 'transparent' }, contentStyle]}>{children}</View>
    </View>
  );
};
