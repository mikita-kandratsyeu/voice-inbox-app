import { Archive, ArchiveRestore, Pin, PinOff } from 'lucide-react-native';
import React from 'react';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColors } from '@/shared/config';
import { hapticMedium } from '@/shared/lib';

export const SwipeableCardContext = React.createContext({ isSwiping: false });

const SWIPE_THRESHOLD = 80;
const CARD_FLY_DISTANCE = 400;
const COLLAPSE_DURATION = 280;
const MAX_HEIGHT = 300;
const MARGIN_BOTTOM = 16;

type LeftSwipeAction = 'archive' | 'unarchive';
type SwipeAction = 'none' | LeftSwipeAction | 'pin';

type SwipeableCardProps = {
  children: React.ReactNode;
  isPinned?: boolean;
  leftAction: LeftSwipeAction;
  onLeftAction: () => void;
  onPin: () => void;
};

export const SwipeableCard = React.memo(function SwipeableCard({
  children,
  isPinned = false,
  leftAction,
  onLeftAction,
  onPin,
}: SwipeableCardProps) {
  const color = useColors();
  const translateX = useSharedValue(0);
  const action = useSharedValue<SwipeAction>('none');
  const [isSwiping, setIsSwiping] = React.useState(false);

  const collapseOpacity = useSharedValue(1);

  const collapseAndExecute = () => {
    collapseOpacity.value = withTiming(0, { duration: COLLAPSE_DURATION }, (finished) => {
      if (finished) scheduleOnRN(onLeftAction);
    });
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
        translateX.value = withSpring(0, { damping: 14, stiffness: 300, mass: 0.6 }, () => {
          scheduleOnRN(onPin);
        });
        action.value = 'none';
      }
    },
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onStart(() => {
      scheduleOnRN(setIsSwiping, true);
    })
    .onUpdate((e: PanGestureHandlerEventPayload) => {
      translateX.value = e.translationX;
    })
    .onEnd((e: PanGestureHandlerEventPayload) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        scheduleOnRN(hapticMedium);
        translateX.value = withTiming(-CARD_FLY_DISTANCE, { duration: 220 }, () => {
          action.value = leftAction;
        });
      } else if (e.translationX > SWIPE_THRESHOLD) {
        scheduleOnRN(hapticMedium);
        translateX.value = withTiming(SWIPE_THRESHOLD * 1.3, { duration: 80 }, () => {
          action.value = 'pin';
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
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
    const progress = Math.min(Math.max(-translateX.value / SWIPE_THRESHOLD, 0), 1);

    return { opacity: progress };
  });

  const pinReveal = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(translateX.value / SWIPE_THRESHOLD, 0), 1);

    return { opacity: progress };
  });

  const pinBgColor = isPinned ? color.accent.unpin : color.accent.pin;
  const leftBgColor = color.accent.archive;

  const LeftIcon = leftAction === 'archive' ? Archive : ArchiveRestore;

  const containerStyle = useAnimatedStyle(() => ({
    maxHeight: MAX_HEIGHT,
    marginHorizontal: 16,
    marginBottom: MARGIN_BOTTOM,
    opacity: collapseOpacity.value,
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
        >
          {isPinned ? (
            <PinOff size={22} color={color.icon.onAccent} strokeWidth={2} />
          ) : (
            <Pin size={22} color={color.icon.onAccent} strokeWidth={2} />
          )}
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={cardStyle}>{children}</Animated.View>
        </GestureDetector>
      </Animated.View>
    </SwipeableCardContext.Provider>
  );
});
