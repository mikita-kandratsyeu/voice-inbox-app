import React from 'react';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

type DottedBackgroundProps = {
  width: number;
  height: number;
  dotColor: string;
  spacing?: number;
  dotRadius?: number;
  opacity?: number;
};

export function DottedBackground({
  width,
  height,
  dotColor,
  spacing = 40,
  dotRadius = 2.25,
  opacity = 0.35,
}: DottedBackgroundProps) {
  const patternId = 'notes-graph-dot-pattern';

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <Pattern id={patternId} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <Circle
            cx={spacing / 2}
            cy={spacing / 2}
            r={dotRadius}
            fill={dotColor}
            opacity={opacity}
          />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
    </Svg>
  );
}
