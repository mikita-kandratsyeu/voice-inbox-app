import { CircleDashed, LayoutGrid, Waypoints } from 'lucide-react-native';
import React from 'react';

import type { GraphLayoutMode } from '../lib/graphTypes';

type GraphLayoutModeIconProps = {
  mode: GraphLayoutMode;
  accentHex: string;
  size?: number;
  strokeWidth?: number;
};

export function GraphLayoutModeIcon({
  mode,
  accentHex,
  size = 18,
  strokeWidth = 2,
}: GraphLayoutModeIconProps) {
  const iconProps = {
    size,
    color: accentHex,
    strokeWidth,
  } as const;

  switch (mode) {
    case 'cluster':
      return <LayoutGrid {...iconProps} />;
    case 'force':
      return <Waypoints {...iconProps} />;
    case 'circular':
      return <CircleDashed {...iconProps} />;
  }
}
