import { Loader } from 'lucide-react-native';
import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type WhisperModelSpinnerProps = {
  color: string;
  size?: number;
};

export const WhisperModelSpinner = ({ color, size = 18 }: WhisperModelSpinnerProps) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Loader size={size} color={color} strokeWidth={2} />
    </Animated.View>
  );
};
