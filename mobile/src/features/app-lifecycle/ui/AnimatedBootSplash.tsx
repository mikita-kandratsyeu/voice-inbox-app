import { useCallback } from 'react';
import { Image } from 'react-native';
import BootSplash, { type Manifest } from 'react-native-bootsplash';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import bootsplashManifest from '@/shared/assets/bootsplash/manifest.json';
import { ANIMATION_DURATIONS, SCALE_VALUES, TIMING_CONFIGS } from '@/shared/config';
import { useMountedRef, useSafeCallback } from '@/shared/lib';

const LOGO_CORNER_RADIUS = 22;

const manifest = bootsplashManifest as Manifest;

type Props = {
  ready: boolean;
  onAnimationEnd: () => void;
};

export function AnimatedBootSplash({ ready, onAnimationEnd }: Props) {
  const mountedRef = useMountedRef();
  const safeOnAnimationEnd = useSafeCallback(mountedRef, onAnimationEnd);
  const logoScale = useSharedValue(SCALE_VALUES.normal);
  const containerOpacity = useSharedValue(1);

  const handleAnimate = useCallback(() => {
    logoScale.value = withTiming(SCALE_VALUES.bootSplashEnd, TIMING_CONFIGS.bootSplash);
    containerOpacity.value = withTiming(
      0,
      {
        duration: ANIMATION_DURATIONS.fadeOut,
        easing: Easing.out(Easing.quad),
      },
      (finished) => {
        if (finished) {
          scheduleOnRN(safeOnAnimationEnd);
        }
      },
    );
  }, [containerOpacity, logoScale, safeOnAnimationEnd]);

  const { container, logo } = BootSplash.useHideAnimation({
    manifest,
    logo: require('@/shared/assets/app-icon.png'),
    ready,
    animate: handleAnimate,
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const animatedLogoWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const { style: logoSizeStyle, ...logoRest } = logo;

  return (
    <Animated.View {...container} style={[container.style, animatedContainerStyle]}>
      <Animated.View
        style={[
          logoSizeStyle,
          {
            borderRadius: LOGO_CORNER_RADIUS,
            overflow: 'hidden',
          },
          animatedLogoWrapperStyle,
        ]}
      >
        <Image
          {...logoRest}
          resizeMode={logo.resizeMode ?? 'cover'}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </Animated.View>
  );
}
