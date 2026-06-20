import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  /** Ignored — iCloud mark uses official brand blue. */
  color?: ColorValue;
  /** Ignored — keeps call sites compatible with Lucide icon props. */
  strokeWidth?: number;
};

/** Official iCloud brand blue (Simple Icons). */
const ICLOUD_BRAND_BLUE = '#3693F3';

/** Official iCloud cloud mark (Simple Icons path, viewBox 0 0 24 24). */
export function IcloudIcon({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill={ICLOUD_BRAND_BLUE}
        d="M13.762 4.29a6.51 6.51 0 0 0-5.669 3.332 3.571 3.571 0 0 0-1.558-.36 3.571 3.571 0 0 0-3.516 3A4.918 4.918 0 0 0 0 14.796a4.918 4.918 0 0 0 4.92 4.914 4.93 4.93 0 0 0 .617-.045h14.42c2.305-.272 4.041-2.258 4.043-4.589v-.009a4.594 4.594 0 0 0-3.727-4.508 6.51 6.51 0 0 0-6.511-6.27z"
      />
    </Svg>
  );
}
