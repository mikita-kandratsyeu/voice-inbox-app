import React from 'react';
import { type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFadeInEntering } from '@/shared/config';

type RotatingTipTextProps = {
  text: string;
  color: string;
  className?: string;
  style?: TextStyle;
};

/** Cross-fades when `text` changes (rotating AI tips). Unmounts instantly with the parent. */
export function RotatingTipText({ text, color, className, style }: RotatingTipTextProps) {
  const entering = useFadeInEntering(320);

  if (!text) return null;

  return (
    <Animated.Text
      key={text}
      entering={entering}
      className={className ?? 'text-[14px] leading-5'}
      style={[style, { color }]}
    >
      {text}
    </Animated.Text>
  );
}
