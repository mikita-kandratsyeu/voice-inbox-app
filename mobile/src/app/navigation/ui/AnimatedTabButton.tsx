import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

export const AnimatedTabButton = ({ children, onPress, onLongPress }: BottomTabBarButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.82,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className="my-0 flex-1 items-center justify-center py-0"
    >
      <Animated.View className="items-center justify-center" style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};
