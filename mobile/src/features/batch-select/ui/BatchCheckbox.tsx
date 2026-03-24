import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import type { Colors } from '@/shared/config';

type BatchCheckboxProps = {
  isSelected: boolean;
  color: Colors;
  size?: number;
};

export const BatchCheckbox = ({ isSelected, color, size = 22 }: BatchCheckboxProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.82, duration: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 280, friction: 12 }),
    ]).start();
  }, [isSelected, scaleAnim]);

  const borderColor = isSelected ? color.accent.primary : color.border.default;
  const bgColor = isSelected ? color.accent.primary : 'transparent';
  const checkColor = color.icon.onAccent;

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: scaleAnim }],
      }}
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
