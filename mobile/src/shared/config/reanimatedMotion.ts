import { useMemo } from 'react';
import { Easing, FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { shouldReduceMotion } from './animations';

type FadeMotionOptions = {
  delay?: number;
  easing?: (value: number) => number;
};

function isMotionReduced(reanimatedReduced: boolean | null): boolean {
  return Boolean(reanimatedReduced) || shouldReduceMotion();
}

/** Combines iOS accessibility setting with Reanimated's reduced-motion hook. */
export function useIsMotionReduced(): boolean {
  const reanimatedReduced = useReducedMotion();
  return isMotionReduced(reanimatedReduced);
}

export function useFadeInEntering(duration: number, options?: FadeMotionOptions) {
  const reduced = useIsMotionReduced();

  return useMemo(() => {
    if (reduced) return undefined;

    let animation = FadeIn.duration(duration);
    if (options?.easing) {
      animation = animation.easing(options.easing);
    }
    if (options?.delay != null) {
      animation = animation.delay(options.delay);
    }
    return animation;
  }, [duration, options?.delay, options?.easing, reduced]);
}

export function useFadeOutExiting(duration: number, options?: FadeMotionOptions) {
  const reduced = useIsMotionReduced();

  return useMemo(() => {
    if (reduced) return undefined;

    let animation = FadeOut.duration(duration);
    if (options?.easing) {
      animation = animation.easing(options.easing);
    }
    if (options?.delay != null) {
      animation = animation.delay(options.delay);
    }
    return animation;
  }, [duration, options?.delay, options?.easing, reduced]);
}

export const FADE_IN_EASING_OUT_CUBIC = Easing.out(Easing.cubic);
