import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import type { TouchableOpacityProps } from 'react-native';
import { TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { SCALE_VALUES, SPRING_CONFIGS } from '@/shared/config';

function tabBarButtonRestToTouchable(
  rest: Omit<
    BottomTabBarButtonProps,
    'children' | 'onPress' | 'onLongPress' | 'onPressIn' | 'onPressOut'
  >,
): TouchableOpacityProps {
  return Object.fromEntries(
    Object.entries(rest).map(([key, value]) => [key, value === null ? undefined : value]),
  ) as TouchableOpacityProps;
}

export const AnimatedTabButton = ({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  ...rest
}: BottomTabBarButtonProps) => {
  const scale = useSharedValue(SCALE_VALUES.normal);

  const handlePressIn = () => {
    scale.value = withSpring(SCALE_VALUES.pressed, SPRING_CONFIGS.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(SCALE_VALUES.normal, SPRING_CONFIGS.soft);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      {...tabBarButtonRestToTouchable(rest)}
      accessibilityRole="button"
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      onPressIn={(e) => {
        onPressIn?.(e);
        handlePressIn();
      }}
      onPressOut={(e) => {
        onPressOut?.(e);
        handlePressOut();
      }}
      activeOpacity={1}
      className="my-0 min-h-[48px] shrink-0 self-stretch items-center justify-center py-0"
    >
      <Animated.View className="items-center justify-center" style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};
