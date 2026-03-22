import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export const AnimatedTabButton = ({ children, onPress, onLongPress }: BottomTabBarButtonProps) => {
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
      accessibilityRole="button"
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className="my-0 flex-1 items-center justify-center py-0"
    >
      <Animated.View className="items-center justify-center" style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};
