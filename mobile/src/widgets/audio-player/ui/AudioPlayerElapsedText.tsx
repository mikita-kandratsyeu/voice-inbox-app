import { StyleSheet, TextInput } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';

import { formatElapsedLabelWorklet } from '../lib/formatElapsedLabelWorklet';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AudioPlayerElapsedTextProps = {
  elapsedMsValue: SharedValue<number>;
  color: string;
  fontSize: number;
};

export function AudioPlayerElapsedText({
  elapsedMsValue,
  color,
  fontSize,
}: AudioPlayerElapsedTextProps) {
  const animatedProps = useAnimatedProps(() => {
    const label = formatElapsedLabelWorklet(elapsedMsValue.value);
    return {
      text: label,
      defaultValue: label,
    };
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      pointerEvents="none"
      animatedProps={animatedProps}
      style={[styles.text, { color, fontSize }]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    padding: 0,
    margin: 0,
    minWidth: 36,
    includeFontPadding: false,
    backgroundColor: 'transparent',
  },
});
