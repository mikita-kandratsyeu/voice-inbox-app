import { Pin, PinOff, Trash2 } from 'lucide-react-native';
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

import { colors } from '@/shared/config';
import { hapticMedium } from '@/shared/lib';

export const SwipeableCardContext = React.createContext({ isSwiping: false });

const SWIPE_THRESHOLD = 80;
const CARD_FLY_DISTANCE = 400;
const COLLAPSE_DURATION = 280;
const MAX_HEIGHT = 300;
const MARGIN_BOTTOM = 16;

type SwipeAction = 'none' | 'delete' | 'pin';

type SwipeableCardProps = {
  children: React.ReactNode;
  isPinned?: boolean;
  onDelete: () => void;
  onPin: () => void;
};

export const SwipeableCard = React.memo(function SwipeableCard({
  children,
  isPinned = false,
  onDelete,
  onPin,
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const action = useSharedValue<SwipeAction>('none');
  const [isSwiping, setIsSwiping] = React.useState(false);

  const collapseHeight = useSharedValue(1);
  const collapseOpacity = useSharedValue(1);

  const collapseAndDelete = () => {
    collapseHeight.value = withTiming(0, { duration: COLLAPSE_DURATION });
    collapseOpacity.value = withTiming(0, { duration: COLLAPSE_DURATION - 60 }, (finished) => {
      if (finished) scheduleOnRN(onDelete);
    });
  };

  useAnimatedReaction(
    () => action.value,
    (current, previous) => {
      if (current === previous || current === 'none') {
        return;
      }

      if (current === 'delete') {
        scheduleOnRN(collapseAndDelete);
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
          action.value = 'delete';
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

  const deleteReveal = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(-translateX.value / SWIPE_THRESHOLD, 0), 1);

    return { opacity: progress };
  });

  const pinReveal = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(translateX.value / SWIPE_THRESHOLD, 0), 1);

    return { opacity: progress };
  });

  const pinBgColor = isPinned ? colors.light.accent.unpin : colors.light.accent.pin;

  const containerStyle = useAnimatedStyle(() => ({
    maxHeight: collapseHeight.value * MAX_HEIGHT,
    opacity: collapseOpacity.value,
    marginHorizontal: 16,
    marginBottom: collapseHeight.value * MARGIN_BOTTOM,
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
              backgroundColor: colors.light.accent.delete,
            },
            deleteReveal,
          ]}
        >
          <Trash2 size={22} color={colors.light.icon.onAccent} strokeWidth={2} />
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
            <PinOff size={22} color={colors.light.icon.onAccent} strokeWidth={2} />
          ) : (
            <Pin size={22} color={colors.light.icon.onAccent} strokeWidth={2} />
          )}
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={cardStyle}>{children}</Animated.View>
        </GestureDetector>
      </Animated.View>
    </SwipeableCardContext.Provider>
  );
});
