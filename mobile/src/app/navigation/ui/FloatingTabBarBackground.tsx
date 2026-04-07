import { BlurView } from '@react-native-community/blur';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme, useColors } from '@/shared/config';
import { IS_IOS, useIsTablet, withAlphaHex } from '@/shared/lib';

import {
  FLOAT_TAB_BAR_BACKGROUND_OPACITY,
  FLOAT_TAB_BAR_HEIGHT_PHONE,
  FLOAT_TAB_BAR_HEIGHT_TABLET,
} from '../config/tabBarConfig';

export function FloatingTabBarBackground() {
  const theme = useAppTheme();
  const color = useColors();
  const isTablet = useIsTablet();
  const isDark = theme === 'dark';
  const pillRadius = (isTablet ? FLOAT_TAB_BAR_HEIGHT_TABLET : FLOAT_TAB_BAR_HEIGHT_PHONE) / 2;

  if (!IS_IOS) {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: pillRadius, overflow: 'hidden' }]}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: withAlphaHex(
                color.background.primary,
                FLOAT_TAB_BAR_BACKGROUND_OPACITY,
              ),
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: pillRadius, overflow: 'hidden' }]}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={28}
        reducedTransparencyFallbackColor={color.background.primary}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: withAlphaHex(color.background.primary, isDark ? 0.4 : 0.34),
          },
        ]}
      />
    </View>
  );
}
