import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import {
  FLOAT_TAB_IOS_SHADOW_OFFSET_Y,
  FLOAT_TAB_IOS_SHADOW_RADIUS,
  floatingTabBarShadowOpacity,
} from '@/app/navigation/config';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { IS_IOS, selectPlatform, withAlphaHex } from '@/shared/lib';

import { FrostedChromeBackground } from './FrostedChromeBackground';

/** 44pt header icon touch target — circular frosted chrome. */
export const FROSTED_HEADER_ICON_SIZE = 44;
export const FROSTED_HEADER_ICON_RADIUS = FROSTED_HEADER_ICON_SIZE / 2;

const HEADER_IOS_SHADOW_OFFSET_Y = 2;
const HEADER_IOS_SHADOW_RADIUS = 4;
const HEADER_IOS_SHADOW_OPACITY_CAP = 0.05;
const HEADER_IOS_SHADOW_OPACITY_LIGHT_CAP = 0.09;
const HEADER_ANDROID_ELEVATION = 2;
const HEADER_ANDROID_ELEVATION_LIGHT = 3;

export type FrostedChromeShadow = boolean | 'subtle';

/** Frosted chrome over accent / media backgrounds (recorder). */
export type FrostedChromeVariant = 'default' | 'onMedia';

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
  variant?: FrostedChromeVariant;
};

function resolveChromeBorder(
  color: Colors,
  isDark: boolean,
  shadow: FrostedChromeShadow,
  variant: FrostedChromeVariant,
): {
  borderColor: string;
  borderWidth: number;
} {
  if (variant === 'onMedia') {
    return {
      borderColor: withAlphaHex('#ffffff', 0.2),
      borderWidth: 1,
    };
  }

  const isHeaderChrome = shadow === 'subtle';
  if (!isHeaderChrome) {
    return {
      borderColor: withAlphaHex('#ffffff', isDark ? 0.12 : 0.32),
      borderWidth: StyleSheet.hairlineWidth,
    };
  }

  if (isDark) {
    return {
      borderColor: withAlphaHex('#ffffff', 0.14),
      borderWidth: StyleSheet.hairlineWidth,
    };
  }

  return {
    borderColor: withAlphaHex(color.text.primary, 0.05),
    borderWidth: StyleSheet.hairlineWidth,
  };
}

function resolveChromeFillOverlay(
  color: Colors,
  isDark: boolean,
  shadow: FrostedChromeShadow,
  variant: FrostedChromeVariant,
): string | null {
  if (variant === 'onMedia') {
    return withAlphaHex('#ffffff', IS_IOS ? 0.16 : 0.24);
  }

  if (shadow === 'subtle' && !isDark) {
    return withAlphaHex(color.background.tertiary, IS_IOS ? 0.52 : 0.88);
  }

  return null;
}

function resolveChromeShadowStyle(
  color: Colors,
  shadow: FrostedChromeShadow,
  isDark: boolean,
): ViewStyle | null {
  if (shadow === false) return null;

  if (shadow === 'subtle') {
    return selectPlatform({
      ios: {
        shadowColor: color.shadow.color,
        shadowOffset: { width: 0, height: HEADER_IOS_SHADOW_OFFSET_Y },
        shadowOpacity: Math.min(
          isDark ? HEADER_IOS_SHADOW_OPACITY_CAP : HEADER_IOS_SHADOW_OPACITY_LIGHT_CAP,
          color.shadow.opacity * (isDark ? 0.45 : 0.95),
        ),
        shadowRadius: HEADER_IOS_SHADOW_RADIUS,
      },
      android: {
        elevation: isDark ? HEADER_ANDROID_ELEVATION : HEADER_ANDROID_ELEVATION_LIGHT,
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
  variant = 'default',
}: FrostedChromeSurfaceProps) {
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const { borderColor, borderWidth } = resolveChromeBorder(color, isDark, shadow, variant);
  const fillOverlay = resolveChromeFillOverlay(color, isDark, shadow, variant);
  const resolvedRadius = fixedSize != null ? fixedSize / 2 : borderRadius;
  const fixedSquare =
    fixedSize != null ? { width: fixedSize, height: fixedSize } : null;

  return (
    <View
      style={[
        { borderRadius: resolvedRadius, backgroundColor: 'transparent' },
        fixedSquare,
        resolveChromeShadowStyle(color, shadow, isDark),
        style,
      ]}
    >
      <View
        style={{
          ...fixedSquare,
          borderRadius: resolvedRadius,
          overflow: 'hidden',
          borderWidth: showBorder ? borderWidth : 0,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FrostedChromeBackground borderRadius={resolvedRadius} />
        {fillOverlay != null ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: resolvedRadius,
                backgroundColor: fillOverlay,
              },
            ]}
          />
        ) : null}
        {children}
      </View>
    </View>
  );
}
