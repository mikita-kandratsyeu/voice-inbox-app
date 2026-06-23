import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import type { Colors } from '@/shared/config';

import { getLegendEdgeStrokeStyle } from '../lib/graphEdgeStyles';
import type { GraphEdgeKind } from '../lib/graphTypes';

const LEGEND_SWATCH_WIDTH = 36;
const LEGEND_SWATCH_HEIGHT = 14;

function LegendLineSample({ edgeKind, color }: { edgeKind: GraphEdgeKind; color: Colors }) {
  const style = getLegendEdgeStrokeStyle(edgeKind, color);
  const lineY = LEGEND_SWATCH_HEIGHT / 2;

  return (
    <View
      style={{
        width: LEGEND_SWATCH_WIDTH,
        height: LEGEND_SWATCH_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        backgroundColor: color.background.tertiary,
      }}
    >
      <Svg width={LEGEND_SWATCH_WIDTH - 8} height={LEGEND_SWATCH_HEIGHT}>
        <Line
          x1={0}
          y1={lineY}
          x2={LEGEND_SWATCH_WIDTH - 8}
          y2={lineY}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
          strokeLinecap={style.strokeLinecap ?? 'round'}
          opacity={style.opacity}
        />
      </Svg>
    </View>
  );
}

export function GraphLegendLineRow({
  color,
  edgeKind,
  label,
  count,
}: {
  color: Colors;
  edgeKind: GraphEdgeKind;
  label: string;
  count?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 22 }}>
      <LegendLineSample edgeKind={edgeKind} color={color} />
      <LegendLabel color={color} label={label} count={count} />
    </View>
  );
}

export function GraphLegendDotRow({
  color,
  dotColor,
  label,
  count,
}: {
  color: Colors;
  dotColor: string;
  label: string;
  count?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 22 }}>
      <View
        style={{
          width: LEGEND_SWATCH_WIDTH,
          height: LEGEND_SWATCH_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          backgroundColor: color.background.tertiary,
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: dotColor,
          }}
        />
      </View>
      <LegendLabel color={color} label={label} count={count} />
    </View>
  );
}

function LegendLabel({ color, label, count }: { color: Colors; label: string; count?: number }) {
  return (
    <Text
      numberOfLines={1}
      style={{
        color: color.text.primary,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 17,
        flexShrink: 1,
      }}
    >
      {count != null ? `${label} · ${count}` : label}
    </Text>
  );
}

export function GraphLegendSectionTitle({ color, title }: { color: Colors; title: string }) {
  return (
    <Text
      style={{
        color: color.text.secondary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.4,
        lineHeight: 14,
        textTransform: 'uppercase',
      }}
    >
      {title}
    </Text>
  );
}
