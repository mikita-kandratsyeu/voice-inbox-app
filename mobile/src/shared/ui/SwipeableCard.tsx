import { Pin, PinOff, Trash2 } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Animated as RNAnimated } from 'react-native';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import { colors } from '@/shared/config';

export const SwipeableCardContext = React.createContext({ isSwiping: false });

const SWIPE_THRESHOLD = 80;
const CARD_FLY_DISTANCE = 400;
const COLLAPSE_DURATION = 280;

type SwipeAction = 'none' | 'delete' | 'pin';

type SwipeableCardProps = {
  children: React.ReactNode;
  isPinned?: boolean;
  onDelete: () => void;
  onPin: () => void;
};

export const SwipeableCard = ({
  children,
  isPinned = false,
  onDelete,
  onPin,
}: SwipeableCardProps) => {
  const translateX = useSharedValue(0);
  const action = useSharedValue<SwipeAction>('none');
  const [isSwiping, setIsSwiping] = React.useState(false);

  const collapseHeight = useRef(new RNAnimated.Value(1)).current;
  const collapseOpacity = useRef(new RNAnimated.Value(1)).current;

  const collapseAndDelete = () => {
    RNAnimated.parallel([
      RNAnimated.timing(collapseHeight, {
        toValue: 0,
        duration: COLLAPSE_DURATION,
        useNativeDriver: false,
      }),
      RNAnimated.timing(collapseOpacity, {
        toValue: 0,
        duration: COLLAPSE_DURATION - 60,
        useNativeDriver: false,
      }),
    ]).start(() => onDelete());
  };

  const triggerPin = () => {
    runOnJS(onPin)();
  };

  useAnimatedReaction(
    () => action.value,
    (current, previous) => {
      if (current === previous || current === 'none') {
        return;
      }

      if (current === 'delete') {
        runOnJS(collapseAndDelete)();
      } else if (current === 'pin') {
        translateX.value = withSpring(0, { damping: 14, stiffness: 300, mass: 0.6 }, () => {
          runOnJS(triggerPin)();
        });
        action.value = 'none';
      }
    },
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onStart(() => {
      runOnJS(setIsSwiping)(true);
    })
    .onUpdate((e: PanGestureHandlerEventPayload) => {
      translateX.value = e.translationX;
    })
    .onEnd((e: PanGestureHandlerEventPayload) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-CARD_FLY_DISTANCE, { duration: 220 }, () => {
          action.value = 'delete';
        });
      } else if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SWIPE_THRESHOLD * 1.3, { duration: 80 }, () => {
          action.value = 'pin';
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
      runOnJS(setIsSwiping)(false);
    })
    .onFinalize(() => {
      runOnJS(setIsSwiping)(false);
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

  const containerStyle = {
    maxHeight: collapseHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 300],
    }),
    opacity: collapseOpacity,
    marginHorizontal: 16,
    marginBottom: collapseHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 16],
    }),
  };

  return (
    <SwipeableCardContext.Provider value={{ isSwiping }}>
      <RNAnimated.View style={containerStyle}>
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
      </RNAnimated.View>
    </SwipeableCardContext.Provider>
  );
};
