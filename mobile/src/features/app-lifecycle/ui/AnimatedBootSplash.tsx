import { useCallback } from 'react';
import { Image } from 'react-native';
import BootSplash, { type Manifest } from 'react-native-bootsplash';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import bootsplashManifest from '@/shared/assets/bootsplash/manifest.json';

const LOGO_CORNER_RADIUS = 22;

const manifest = bootsplashManifest as Manifest;

type Props = {
  ready: boolean;
  onAnimationEnd: () => void;
};

export function AnimatedBootSplash({ ready, onAnimationEnd }: Props) {
  const logoScale = useSharedValue(1);
  const containerOpacity = useSharedValue(1);

  const handleAnimate = useCallback(() => {
    logoScale.value = withTiming(1.07, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    containerOpacity.value = withTiming(
      0,
      {
        duration: 480,
        easing: Easing.out(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(onAnimationEnd)();
        }
      },
    );
  }, [containerOpacity, logoScale, onAnimationEnd]);

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
