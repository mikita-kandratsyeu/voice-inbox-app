import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { selectPlatform, withAlphaHex } from '@/shared/lib';

import { FrostedChromeBackground } from './FrostedChromeBackground';

/** 44pt header icon touch target — circular frosted chrome. */
export const FROSTED_HEADER_ICON_SIZE = 44;
export const FROSTED_HEADER_ICON_RADIUS = FROSTED_HEADER_ICON_SIZE / 2;

const HEADER_IOS_SHADOW_OFFSET_Y = 2;
const HEADER_IOS_SHADOW_RADIUS = 4;
const HEADER_IOS_SHADOW_OPACITY_CAP = 0.05;
const HEADER_ANDROID_ELEVATION = 2;

export type FrostedChromeShadow = boolean | 'subtle';

type FrostedChromeSurfaceProps = {
  children: ReactNode;
  color: Colors;
  borderRadius?: number;
  /** Square width/height for a perfect circle (e.g. header back button). */
  fixedSize?: number;
  style?: StyleProp<ViewStyle>;
  showBorder?: boolean;
  /** `true` — filter-bar lift; `'subtle'` — header icons; `false` — flat. */
  shadow?: FrostedChromeShadow;
};

function resolveChromeShadowStyle(
  color: Colors,
  shadow: FrostedChromeShadow,
): ViewStyle | null {
  if (shadow === false) return null;

  if (shadow === 'subtle') {
    return selectPlatform({
      ios: {
        shadowColor: color.shadow.color,
        shadowOffset: { width: 0, height: HEADER_IOS_SHADOW_OFFSET_Y },
        shadowOpacity: Math.min(HEADER_IOS_SHADOW_OPACITY_CAP, color.shadow.opacity * 0.45),
        shadowRadius: HEADER_IOS_SHADOW_RADIUS,
      },
      android: {
        elevation: HEADER_ANDROID_ELEVATION,
      },
      default: {},
    });
  }

  return selectPlatform({
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
  });
}

export function FrostedChromeSurface({
  children,
  color,
  borderRadius = 12,
  fixedSize,
  style,
  showBorder = true,
  shadow = true,
}: FrostedChromeSurfaceProps) {
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const borderColor = withAlphaHex('#ffffff', isDark ? 0.12 : 0.32);
  const resolvedRadius = fixedSize != null ? fixedSize / 2 : borderRadius;
  const fixedSquare =
    fixedSize != null ? { width: fixedSize, height: fixedSize } : null;

  return (
    <View
      style={[
        { borderRadius: resolvedRadius, backgroundColor: 'transparent' },
        fixedSquare,
        resolveChromeShadowStyle(color, shadow),
        style,
      ]}
    >
      <View
        style={{
          ...fixedSquare,
          borderRadius: resolvedRadius,
          overflow: 'hidden',
          borderWidth: showBorder ? StyleSheet.hairlineWidth : 0,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FrostedChromeBackground borderRadius={resolvedRadius} />
        {children}
      </View>
    </View>
  );
}
