import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import { type Colors, useAppTheme } from '@/shared/config';
import { selectPlatform, withAlphaHex } from '@/shared/lib';

import { FrostedChromeBackground } from './FrostedChromeBackground';

export {
  FLOATING_SEARCH_BAR_BOTTOM_GAP,
  FLOATING_SEARCH_BAR_INNER_VERTICAL_PAD,
  getFloatingSearchBarChromeBottomInset,
} from './floatingSearchBarMetrics';

export const FLOATING_FROSTED_CHROME_RADIUS = 12;

type FloatingFrostedChromeProps = {
  color: Colors;
  insetsBottom: number;
  horizontalInset?: number;
  topInset?: number;
  outerBottomPadding?: number;
  borderRadius?: number;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function FloatingFrostedChrome({
  color,
  insetsBottom,
  horizontalInset = 16,
  topInset = 10,
  outerBottomPadding,
  borderRadius = FLOATING_FROSTED_CHROME_RADIUS,
  contentStyle,
  children,
}: FloatingFrostedChromeProps) {
  const theme = useAppTheme();
  const isDark = theme === 'dark';

  return (
    <View
      style={{
        paddingHorizontal: horizontalInset,
        paddingTop: topInset,
        paddingBottom: outerBottomPadding ?? Math.max(insetsBottom, 8),
      }}
    >
      <View
        style={{
          borderRadius,
          backgroundColor: 'transparent',
          ...selectPlatform({
            ios: {
              shadowColor: color.shadow.color,
              shadowOffset: { width: 0, height: FLOAT_TAB_IOS_SHADOW_OFFSET_Y },
              shadowOpacity: floatingTabBarShadowOpacity(color.shadow.opacity),
              shadowRadius: FLOAT_TAB_IOS_SHADOW_RADIUS,
            },
            android: {
              elevation: 8,
            },
            default: {},
          }),
        }}
      >
        <View
          style={{
            borderRadius,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: withAlphaHex('#ffffff', isDark ? 0.12 : 0.32),
          }}
        >
          <FrostedChromeBackground borderRadius={borderRadius} />
          <View style={contentStyle}>{children}</View>
        </View>
      </View>
    </View>
  );
}

export function FloatingFrostedChromeDivider({ color }: { color: Colors }) {
  return (
    <View
      style={{
        alignSelf: 'stretch',
        width: 1,
        backgroundColor: color.border.default,
        marginLeft: 8,
      }}
    />
  );
}

export function FloatingFrostedChromeSection({ children }: { children: ReactNode }) {
  return <View style={{ justifyContent: 'center', paddingLeft: 8 }}>{children}</View>;
}
