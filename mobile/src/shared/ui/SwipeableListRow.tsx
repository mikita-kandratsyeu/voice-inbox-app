import React, { memo, useMemo, useState } from 'react';
import {
  GestureDetector,
  type PanGestureActiveEvent,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ANIMATION_DURATIONS, GESTURE_THRESHOLDS, SPRING_CONFIGS } from '@/shared/config';
import { playGestureSwipeHaptic, useHapticsWorkletGate } from '@/shared/lib/haptics';

const ROW_FLY_DISTANCE = 400;

type SwipeableListRowContextValue = {
  isSwiping: boolean;
};

export const SwipeableListRowContext = React.createContext<SwipeableListRowContextValue>({
  isSwiping: false,
});

type SwipeableListRowProps = {
  children: React.ReactNode;
  onSwipeAction: () => void;
  actionBackgroundColor: string;
  actionIcon: React.ReactNode;
  actionAccessibilityLabel: string;
  surfaceBackgroundColor: string;
  swipeThreshold?: number;
  flyDistance?: number;
  hapticFeedback?: boolean;
};

export const SwipeableListRow = memo(function SwipeableListRow({
  children,
  onSwipeAction,
  actionBackgroundColor,
  actionIcon,
  actionAccessibilityLabel,
  surfaceBackgroundColor,
  swipeThreshold = GESTURE_THRESHOLDS.swipe,
  flyDistance = ROW_FLY_DISTANCE,
  hapticFeedback = true,
}: SwipeableListRowProps) {
  const translateX = useSharedValue(0);
  const shouldExecute = useSharedValue(false);
  const { enabled: hapticsEnabled, fullProfile: hapticsFullProfile } = useHapticsWorkletGate();
  const [isSwiping, setIsSwiping] = useState(false);
  const collapseOpacity = useSharedValue(1);

  const contextValue = useMemo<SwipeableListRowContextValue>(() => ({ isSwiping }), [isSwiping]);

  useAnimatedReaction(
    () => shouldExecute.value,
    (current, previous) => {
      if (!current || current === previous) return;
      collapseOpacity.value = withTiming(
        0,
        { duration: ANIMATION_DURATIONS.collapse },
        (finished) => {
          if (finished) {
            scheduleOnRN(onSwipeAction);
          }
        },
      );
      shouldExecute.value = false;
    },
  );

  const pan = usePanGesture({
    activeOffsetX: [-GESTURE_THRESHOLDS.activeOffset, GESTURE_THRESHOLDS.activeOffset],
    failOffsetY: [-GESTURE_THRESHOLDS.failOffset, GESTURE_THRESHOLDS.failOffset],
    onActivate: () => {
      cancelAnimation(translateX);
      scheduleOnRN(setIsSwiping, true);
    },
    onUpdate: (event: PanGestureActiveEvent) => {
      translateX.value = Math.min(0, event.translationX);
    },
    onDeactivate: (event: PanGestureActiveEvent) => {
      const threshold = -swipeThreshold;
      if (event.translationX < threshold) {
        if (hapticFeedback) {
          playGestureSwipeHaptic(hapticsEnabled, hapticsFullProfile);
        }
        translateX.value = withTiming(-flyDistance, { duration: 220 }, (finished) => {
          if (finished) {
            shouldExecute.value = true;
          }
        });
      } else {
        translateX.value = withSpring(0, SPRING_CONFIGS.gentle);
      }
      scheduleOnRN(setIsSwiping, false);
    },
    onFinalize: () => {
      scheduleOnRN(setIsSwiping, false);
    },
  });

  const rowStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: translateX.value }],
    }),
    [],
  );

  const actionReveal = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(-translateX.value / swipeThreshold, 0), 1);
    return { opacity: progress };
  }, [swipeThreshold]);

  const containerStyle = useAnimatedStyle(
    () => ({
      opacity: collapseOpacity.value,
    }),
    [],
  );

  return (
    <SwipeableListRowContext.Provider value={contextValue}>
      <Animated.View style={[{ overflow: 'hidden', width: '100%' }, containerStyle]}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel}
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '100%',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingRight: 24,
              backgroundColor: actionBackgroundColor,
            },
            actionReveal,
          ]}
          pointerEvents="none"
        >
          {actionIcon}
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[{ width: '100%', backgroundColor: surfaceBackgroundColor }, rowStyle]}
          >
            {children}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </SwipeableListRowContext.Provider>
  );
});
