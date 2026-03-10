import { Loader } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

type WhisperModelSpinnerProps = {
  color: string;
  size?: number;
};

export const WhisperModelSpinner = ({ color, size = 18 }: WhisperModelSpinnerProps) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader size={size} color={color} strokeWidth={2} />
    </Animated.View>
  );
};
