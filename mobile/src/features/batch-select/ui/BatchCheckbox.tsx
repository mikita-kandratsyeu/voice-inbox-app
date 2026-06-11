import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { ANIMATION_DURATIONS, SCALE_VALUES, SPRING_CONFIGS } from '@/shared/config';

type BatchCheckboxProps = {
  isSelected: boolean;
  color: Colors;
  size?: number;
};

export const BatchCheckbox = ({ isSelected, color, size = 22 }: BatchCheckboxProps) => {
  const scale = useSharedValue(SCALE_VALUES.normal);

  useEffect(() => {
    cancelAnimation(scale);
    scale.value = withSequence(
      withTiming(SCALE_VALUES.checkboxPressed, { duration: ANIMATION_DURATIONS.pressIn }),
      withSpring(SCALE_VALUES.normal, {
        ...SPRING_CONFIGS.snappy,
        damping: 12,
      }),
    );
  }, [isSelected, scale]);

  const borderColor = isSelected ? color.accent.primary : color.border.default;
  const bgColor = isSelected ? color.accent.primary : 'transparent';
  const checkColor = color.icon.onAccent;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
    >
      {isSelected && (
        <Animated.View
          style={{
            width: size * 0.45,
            height: size * 0.25,
            borderLeftWidth: 2,
            borderBottomWidth: 2,
            borderColor: checkColor,
            transform: [{ rotate: '-45deg' }, { translateY: -1 }],
          }}
        />
      )}
    </Animated.View>
  );
};
