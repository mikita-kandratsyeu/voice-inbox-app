import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import type { GraphExportBackgroundStyle } from '../lib/graphExportBackground';
import { DottedBackground } from './DottedBackground';

const CHECKER_SIZE = 12;
const CHECKER_LIGHT = '#e5e7eb';
const CHECKER_DARK = '#f3f4f6';

type GraphExportBackgroundFillProps = {
  width: number;
  height: number;
  background: GraphExportBackgroundStyle;
  showTransparencyGrid?: boolean;
  offsetX?: number;
  offsetY?: number;
};

function TransparencyCheckerboard({ width, height }: { width: number; height: number }) {
  const patternId = 'graph-export-transparency-grid';

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <Pattern
          id={patternId}
          width={CHECKER_SIZE * 2}
          height={CHECKER_SIZE * 2}
          patternUnits="userSpaceOnUse"
        >
          <Rect x={0} y={0} width={CHECKER_SIZE} height={CHECKER_SIZE} fill={CHECKER_LIGHT} />
          <Rect
            x={CHECKER_SIZE}
            y={0}
            width={CHECKER_SIZE}
            height={CHECKER_SIZE}
            fill={CHECKER_DARK}
          />
          <Rect
            x={0}
            y={CHECKER_SIZE}
            width={CHECKER_SIZE}
            height={CHECKER_SIZE}
            fill={CHECKER_DARK}
          />
          <Rect
            x={CHECKER_SIZE}
            y={CHECKER_SIZE}
            width={CHECKER_SIZE}
            height={CHECKER_SIZE}
            fill={CHECKER_LIGHT}
          />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
    </Svg>
  );
}

export function GraphExportBackgroundFill({
  width,
  height,
  background,
  showTransparencyGrid = false,
  offsetX = 0,
  offsetY = 0,
}: GraphExportBackgroundFillProps) {
  const isTransparent = background.backgroundColor === 'transparent';

  return (
    <View
      style={{
        backgroundColor: isTransparent ? 'transparent' : background.backgroundColor,
        height,
        left: offsetX,
        position: 'absolute',
        top: offsetY,
        width,
      }}
    >
      {isTransparent && showTransparencyGrid ? (
        <TransparencyCheckerboard width={width} height={height} />
      ) : null}
      {background.showDots ? (
        <DottedBackground width={width} height={height} dotColor={background.dotColor} />
      ) : null}
    </View>
  );
}
