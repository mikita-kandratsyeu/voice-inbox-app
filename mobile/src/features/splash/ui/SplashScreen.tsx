import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, useColorScheme } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors } from '@/shared/config';

import {
  SPLASH_FADE_IN_DURATION_MS,
  SPLASH_FADE_OUT_DURATION_MS,
  SPLASH_MIN_DURATION_MS,
} from '../model/constants';

type SplashScreenProps = {
  onFinish: () => void;
};

export const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const color = getColors(isDark ? 'dark' : 'light');
  const insets = useSafeAreaInsets();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(8);
  const versionOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: SPLASH_FADE_IN_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: SPLASH_FADE_IN_DURATION_MS,
      easing: Easing.out(Easing.back(1.2)),
    });

    textOpacity.value = withDelay(
      SPLASH_FADE_IN_DURATION_MS * 0.4,
      withTiming(1, {
        duration: SPLASH_FADE_IN_DURATION_MS * 0.6,
        easing: Easing.out(Easing.cubic),
      }),
    );
    textTranslateY.value = withDelay(
      SPLASH_FADE_IN_DURATION_MS * 0.4,
      withTiming(0, {
        duration: SPLASH_FADE_IN_DURATION_MS * 0.6,
        easing: Easing.out(Easing.cubic),
      }),
    );
    taglineOpacity.value = withDelay(
      SPLASH_FADE_IN_DURATION_MS * 0.6,
      withTiming(1, {
        duration: SPLASH_FADE_IN_DURATION_MS * 0.5,
        easing: Easing.out(Easing.cubic),
      }),
    );
    taglineTranslateY.value = withDelay(
      SPLASH_FADE_IN_DURATION_MS * 0.6,
      withTiming(0, {
        duration: SPLASH_FADE_IN_DURATION_MS * 0.5,
        easing: Easing.out(Easing.cubic),
      }),
    );
    versionOpacity.value = withDelay(
      SPLASH_FADE_IN_DURATION_MS * 0.7,
      withTiming(1, {
        duration: SPLASH_FADE_IN_DURATION_MS * 0.5,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [
    logoOpacity,
    logoScale,
    textOpacity,
    textTranslateY,
    taglineOpacity,
    taglineTranslateY,
    versionOpacity,
  ]);

  const finishSplash = () => {
    onFinish();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      containerOpacity.value = withTiming(
        0,
        {
          duration: SPLASH_FADE_OUT_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(finishSplash)();
          }
        },
      );
    }, SPLASH_MIN_DURATION_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerOpacity, onFinish]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const versionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: versionOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[containerAnimatedStyle, { backgroundColor: color.background.primary }]}
      className="flex-1 items-center justify-center"
    >
      <Animated.View style={logoAnimatedStyle} className="mb-5">
        <Image
          source={require('../../../shared/assets/app-icon.png')}
          className="h-28 w-28 rounded-[30px]"
          resizeMode="cover"
        />
      </Animated.View>

      <Animated.View style={textAnimatedStyle} className="items-center">
        <Text className="text-3xl font-bold" style={{ color: color.text.primary }}>
          Voice Inbox
        </Text>
        <Animated.Text
          style={[taglineAnimatedStyle, { color: color.text.secondary }]}
          className="mt-2 text-center text-base"
        >
          {t('splash.tagline')}
        </Animated.Text>
      </Animated.View>

      <Animated.View
        style={[versionAnimatedStyle, { position: 'absolute', bottom: insets.bottom + 24 }]}
      >
        <Text className="text-xs" style={{ color: color.text.muted }}>
          {DeviceInfo.getVersion()}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};
