import { isLiquidGlassSupported, LiquidGlassView } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';
import React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { useAppTheme, useColors } from '@/shared/config';
import { IS_IOS, withAlphaHex } from '@/shared/lib';

const ABSOLUTE_FILL: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const ANDROID_FILL_OPACITY = 0.88;
const IOS_EXTRA_TINT_LIGHT = 0.34;
const IOS_EXTRA_TINT_DARK = 0.4;
const BLUR_AMOUNT = 28;
/** Translucent glass over saturated accent backgrounds (recorder). */
export const ON_MEDIA_CHROME_FILL = 'rgba(255,255,255,0.18)';
export const ON_MEDIA_CHROME_BORDER = 'rgba(255,255,255,0.2)';

export type FrostedChromeBackgroundProps = {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  /** Accent/media color behind the chrome (e.g. recorder screen). */
  mediaTint?: string;
};

type ChromeShellProps = {
  shell: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

function ChromeShell({ shell, children }: ChromeShellProps) {
  return (
    <View pointerEvents="none" style={shell}>
      {children}
    </View>
  );
}

type OpaqueChromeFillProps = {
  backgroundColor: string;
};

function OpaqueChromeFill({ backgroundColor }: OpaqueChromeFillProps) {
  return <View pointerEvents="none" style={[ABSOLUTE_FILL, { backgroundColor }]} />;
}

export function FrostedChromeBackground({
  style,
  borderRadius,
  borderTopLeftRadius = 0,
  borderTopRightRadius = 0,
  borderBottomLeftRadius = 0,
  borderBottomRightRadius = 0,
  mediaTint,
}: FrostedChromeBackgroundProps) {
  const theme = useAppTheme();
  const color = useColors();
  const isDark = theme === 'dark';
  const onMedia = mediaTint != null;

  const radiusStyle: ViewStyle =
    borderRadius != null
      ? { borderRadius }
      : {
          borderTopLeftRadius,
          borderTopRightRadius,
          borderBottomLeftRadius,
          borderBottomRightRadius,
        };

  const shell: StyleProp<ViewStyle> = [ABSOLUTE_FILL, radiusStyle, { overflow: 'hidden' }, style];

  const opaqueFillColor = withAlphaHex(color.background.primary, ANDROID_FILL_OPACITY);

  if (onMedia) {
    if (isLiquidGlassSupported) {
      return (
        <ChromeShell shell={shell}>
          <LiquidGlassView
            pointerEvents="none"
            style={ABSOLUTE_FILL}
            effect="regular"
            colorScheme="light"
          />
          <OpaqueChromeFill backgroundColor={ON_MEDIA_CHROME_FILL} />
        </ChromeShell>
      );
    }

    if (!IS_IOS) {
      return (
        <ChromeShell shell={shell}>
          <OpaqueChromeFill backgroundColor={ON_MEDIA_CHROME_FILL} />
        </ChromeShell>
      );
    }

    return (
      <ChromeShell shell={shell}>
        <BlurView
          style={ABSOLUTE_FILL}
          blurType="light"
          blurAmount={BLUR_AMOUNT}
          reducedTransparencyFallbackColor={mediaTint}
        />
        <OpaqueChromeFill backgroundColor={ON_MEDIA_CHROME_FILL} />
      </ChromeShell>
    );
  }

  if (isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        pointerEvents="none"
        style={shell}
        effect="regular"
        colorScheme={isDark ? 'dark' : 'light'}
      />
    );
  }

  if (!IS_IOS) {
    return (
      <ChromeShell shell={shell}>
        <OpaqueChromeFill backgroundColor={opaqueFillColor} />
      </ChromeShell>
    );
  }

  return (
    <ChromeShell shell={shell}>
      <BlurView
        style={ABSOLUTE_FILL}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={BLUR_AMOUNT}
        reducedTransparencyFallbackColor={color.background.primary}
      />
      <View
        pointerEvents="none"
        style={[
          ABSOLUTE_FILL,
          {
            backgroundColor: withAlphaHex(
              color.background.primary,
              isDark ? IOS_EXTRA_TINT_DARK : IOS_EXTRA_TINT_LIGHT,
            ),
          },
        ]}
      />
    </ChromeShell>
  );
}
