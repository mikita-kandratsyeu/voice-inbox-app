import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

export function IcloudIcon({ size = 24, color = '#007AFF', strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        d="M6.5 19.5h11a5.5 5.5 0 0 0 .9-10.93A7 7 0 0 0 6.2 8.6 5.5 5.5 0 0 0 6.5 19.5Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
