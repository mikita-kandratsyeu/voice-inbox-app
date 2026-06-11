import { Archive, ArchiveRestore, Pin, PinOff } from 'lucide-react-native';
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

import { useColors } from '@/shared/config';
import { ANIMATION_DURATIONS, GESTURE_THRESHOLDS, SPRING_CONFIGS } from '@/shared/config';
import { hapticMedium } from '@/shared/lib';

export const SwipeableCardContext = React.createContext({ isSwiping: false });

const CARD_FLY_DISTANCE = 400;
const DEFAULT_MAX_HEIGHT = 300;
const MARGIN_BOTTOM = 16;

type LeftSwipeAction = 'archive' | 'unarchive';
type SwipeAction = 'none' | LeftSwipeAction | 'pin';

type SwipeableCardProps = {
  children: React.ReactNode;
  isPinned?: boolean;
  leftAction: LeftSwipeAction;
  onLeftAction: () => void;
  onPin?: () => void;
  maxHeight?: number;
  /** When false, right-swipe pin is disabled (e.g. archived inbox). Default true. */
  pinEnabled?: boolean;
  /** Parent supplies list margins — skip outer spacing (inbox layout toggle shell). */
  embedded?: boolean;
};

export const SwipeableCard = memo(function SwipeableCard({
  children,
  isPinned = false,
  leftAction,
  onLeftAction,
  onPin,
  maxHeight = DEFAULT_MAX_HEIGHT,
  embedded = false,
  pinEnabled = true,
}: SwipeableCardProps) {
  const color = useColors();
  const translateX = useSharedValue(0);
  const action = useSharedValue<SwipeAction>('none');
  const [isSwiping, setIsSwiping] = useState(false);

  const collapseOpacity = useSharedValue(1);

  const collapseAndExecute = () => {
    collapseOpacity.value = withTiming(
      0,
      { duration: ANIMATION_DURATIONS.collapse },
      (finished) => {
        if (finished) scheduleOnRN(onLeftAction);
      },
    );
  };

  useAnimatedReaction(
    () => action.value,
    (current, previous) => {
      if (current === previous || current === 'none') {
        return;
      }

      if (current === 'archive' || current === 'unarchive') {
        scheduleOnRN(collapseAndExecute);
      } else if (current === 'pin') {
        cancelAnimation(translateX);
        translateX.value = withSpring(0, SPRING_CONFIGS.bouncy, () => {
          if (onPin) scheduleOnRN(onPin);
        });
        action.value = 'none';
      }
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
      translateX.value = pinEnabled ? e.translationX : Math.min(0, e.translationX);
    })
    .onEnd((e: PanGestureHandlerEventPayload) => {
      if (e.translationX < -GESTURE_THRESHOLDS.swipe) {
        scheduleOnRN(hapticMedium);
        translateX.value = withTiming(-CARD_FLY_DISTANCE, { duration: 220 }, () => {
          action.value = leftAction;
        });
      } else if (pinEnabled && e.translationX > GESTURE_THRESHOLDS.swipe) {
        scheduleOnRN(hapticMedium);
        translateX.value = withTiming(GESTURE_THRESHOLDS.swipeExtended, { duration: 80 }, () => {
          action.value = 'pin';
        });
      } else {
        translateX.value = withSpring(0, SPRING_CONFIGS.gentle);
      }
      scheduleOnRN(setIsSwiping, false);
    })
    .onFinalize(() => {
      scheduleOnRN(setIsSwiping, false);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftReveal = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(-translateX.value / GESTURE_THRESHOLDS.swipe, 0), 1);

    return { opacity: progress };
  });

  const pinReveal = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(translateX.value / GESTURE_THRESHOLDS.swipe, 0), 1);

    return { opacity: progress };
  });

  const pinBgColor = isPinned ? color.accent.unpin : color.accent.pin;
  const leftBgColor = color.accent.archive;

  const LeftIcon = leftAction === 'archive' ? Archive : ArchiveRestore;

  const containerStyle = useAnimatedStyle(() => ({
    maxHeight: embedded ? undefined : maxHeight,
    marginHorizontal: embedded ? 0 : 16,
    marginBottom: embedded ? 0 : MARGIN_BOTTOM,
    opacity: collapseOpacity.value,
    width: embedded ? '100%' : undefined,
  }));

  return (
    <SwipeableCardContext.Provider value={{ isSwiping }}>
      <Animated.View style={containerStyle}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '100%',
              alignItems: 'flex-end',
              justifyContent: 'center',
              borderRadius: 16,
              paddingRight: 24,
              backgroundColor: leftBgColor,
            },
            leftReveal,
          ]}
        >
          <LeftIcon size={22} color={color.icon.onAccent} strokeWidth={2} />
        </Animated.View>
        {pinEnabled ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '100%',
                alignItems: 'flex-start',
                justifyContent: 'center',
                borderRadius: 16,
                paddingLeft: 24,
                backgroundColor: pinBgColor,
              },
              pinReveal,
            ]}
            pointerEvents="none"
          >
            {isPinned ? (
              <PinOff size={22} color={color.icon.onAccent} strokeWidth={2} />
            ) : (
              <Pin size={22} color={color.icon.onAccent} strokeWidth={2} />
            )}
          </Animated.View>
        ) : null}
        <GestureDetector gesture={pan}>
          <Animated.View style={[cardStyle, embedded && { width: '100%' }]}>
            {children}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </SwipeableCardContext.Provider>
  );
});
