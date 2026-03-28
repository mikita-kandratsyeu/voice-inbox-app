import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import type { TouchableOpacityProps } from 'react-native';
import { TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.82, { damping: 12, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
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
