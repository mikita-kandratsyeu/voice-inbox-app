import React from 'react';
import { type TextStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type RotatingTipTextProps = {
  text: string;
  color: string;
  className?: string;
  style?: TextStyle;
};

/** Cross-fades when `text` changes (rotating AI tips). Unmounts instantly with the parent. */
export function RotatingTipText({ text, color, className, style }: RotatingTipTextProps) {
  if (!text) return null;

  return (
    <Animated.Text
      key={text}
      entering={FadeIn.duration(320)}
      className={className ?? 'text-[14px] leading-5'}
      style={[style, { color }]}
    >
      {text}
    </Animated.Text>
  );
}
