import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  /** Ignored — GitLab mark uses brand facet colors for inner polygons. */
  color?: ColorValue;
  /** Ignored — keeps call sites compatible with Lucide icon props. */
  strokeWidth?: number;
};

/** Official GitLab tanuki mark (viewBox 0 0 24 24) with inner facet polygons. */
export function GitlabIcon({ size = 20 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill="#E24329"
        d="M23.6 9.59l-3.27-9.17A.85.85 0 0020.01.38a.85.85 0 00-.98.05.85.85 0 00-.29.39L16.27 7.6H7.73L4.86 1.42a.85.85 0 00-.29-.39.85.85 0 00-.98-.05.85.85 0 00-.33.32L.43 9.59a6.07 6.07 0 002.01 7.01L12 23.05l9.56-6.45a6.07 6.07 0 002.01-7.01z"
      />
      <Path fill="#FC6D26" d="M12 23.05V11.08H7.73L12 23.05z" />
      <Path fill="#FCA326" d="M12 23.05 7.73 7.6H.43l11.57 15.45z" />
      <Path
        fill="#FC6D26"
        d="M7.73 7.6 4.86 1.42a.85.85 0 00-.98-.05.85.85 0 00-.33.32L.43 9.59 7.73 7.6z"
      />
      <Path fill="#FCA326" d="M12 23.05V11.08h4.27L12 23.05z" />
      <Path
        fill="#FC6D26"
        d="M16.27 7.6l2.87-6.18a.85.85 0 01.98-.05.85.85 0 01.33.32l3.27 9.17-7.45-3z"
      />
    </Svg>
  );
}
