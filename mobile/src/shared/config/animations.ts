import { AccessibilityInfo } from 'react-native';
import { Easing } from 'react-native-reanimated';

export const SPRING_CONFIGS = {
  gentle: {
    damping: 20,
    stiffness: 200,
    mass: 1,
  },
  bouncy: {
    damping: 14,
    stiffness: 300,
    mass: 0.6,
  },
  snappy: {
    damping: 22,
    stiffness: 380,
    mass: 1,
  },
  soft: {
    damping: 20,
    stiffness: 280,
    mass: 1,
  },
  criticallyDamped: {
    dampingRatio: 1,
    stiffness: 300,
    mass: 1,
  },
} as const;

export const TIMING_CONFIGS = {
  fast: {
    duration: 150,
    easing: Easing.out(Easing.quad),
  },
  medium: {
    duration: 250,
    easing: Easing.out(Easing.cubic),
  },
  slow: {
    duration: 400,
    easing: Easing.out(Easing.cubic),
  },
  bootSplash: {
    duration: 420,
    easing: Easing.out(Easing.cubic),
  },
  collapse: {
    duration: 280,
    easing: Easing.inOut(Easing.quad),
  },
  linear: {
    duration: 900,
    easing: Easing.linear,
  },
} as const;

export const ANIMATION_DURATIONS = {
  pressIn: 60,
  pressOut: 200,
  slideIn: 220,
  collapse: 280,
  fadeOut: 480,
  bootSplash: 420,
  skeletonPulse: 800,
  spinner: 900,
  inboxCardLayout: 240,
} as const;

export const SCALE_VALUES = {
  pressed: 0.9 as number,
  checkboxPressed: 0.82 as number,
  normal: 1 as number,
  bootSplashEnd: 1.07 as number,
} as const;

export const GESTURE_THRESHOLDS = {
  swipe: 80,
  swipeExtended: 104,
  activeOffset: 10,
  failOffset: 15,
} as const;

let isReduceMotionEnabled = false;

export const initReduceMotionCheck = async () => {
  isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    isReduceMotionEnabled = enabled;
  });
};

export const shouldReduceMotion = (): boolean => isReduceMotionEnabled;

export const getAnimationDuration = (baseDuration: number): number => {
  return shouldReduceMotion() ? 0 : baseDuration;
};

export const withReduceMotion = <T>(animationCallback: () => T, fallbackValue: T): T => {
  return shouldReduceMotion() ? fallbackValue : animationCallback();
};
