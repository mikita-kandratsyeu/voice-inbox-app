import React, { memo, useState } from 'react';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { hapticMedium } from '@/shared/lib';

const ROW_FLY_DISTANCE = 400;

export const SwipeableListRowContext = React.createContext({ isSwiping: false });

type SwipeableListRowProps = {
  children: React.ReactNode;
  onSwipeAction: () => void;
  actionBackgroundColor: string;
  actionIcon: React.ReactNode;
  actionAccessibilityLabel: string;
  /** Opaque surface that slides over the action (matches inbox card background). */
  surfaceBackgroundColor: string;
};

export const SwipeableListRow = memo(function SwipeableListRow({
  children,
  onSwipeAction,
  actionBackgroundColor,
  actionIcon,
  actionAccessibilityLabel,
  surfaceBackgroundColor,
}: SwipeableListRowProps) {
  const translateX = useSharedValue(0);
  const shouldExecute = useSharedValue(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const collapseOpacity = useSharedValue(1);

  const collapseAndExecute = () => {
    collapseOpacity.value = withTiming(
      0,
      { duration: ANIMATION_DURATIONS.collapse },
      (finished) => {
        if (finished) scheduleOnRN(onSwipeAction);
      },
    );
  };

  useAnimatedReaction(
    () => shouldExecute.value,
    (current, previous) => {
      if (!current || current === previous) return;
      scheduleOnRN(collapseAndExecute);
      shouldExecute.value = false;
    },
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-GESTURE_THRESHOLDS.activeOffset, GESTURE_THRESHOLDS.activeOffset])
    .failOffsetY([-GESTURE_THRESHOLDS.failOffset, GESTURE_THRESHOLDS.failOffset])
    .onStart(() => {
      cancelAnimation(translateX);
      scheduleOnRN(setIsSwiping, true);
    })
    .onUpdate((e: PanGestureHandlerEventPayload) => {
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd((e: PanGestureHandlerEventPayload) => {
      if (e.translationX < -GESTURE_THRESHOLDS.swipe) {
        scheduleOnRN(hapticMedium);
        translateX.value = withTiming(-ROW_FLY_DISTANCE, { duration: 220 }, () => {
          shouldExecute.value = true;
        });
      } else {
        translateX.value = withSpring(0, SPRING_CONFIGS.gentle);
      }
      scheduleOnRN(setIsSwiping, false);
    })
    .onFinalize(() => {
      scheduleOnRN(setIsSwiping, false);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionReveal = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(-translateX.value / GESTURE_THRESHOLDS.swipe, 0), 1);
    return { opacity: progress };
  });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: collapseOpacity.value,
  }));

  return (
    <SwipeableListRowContext.Provider value={{ isSwiping }}>
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
